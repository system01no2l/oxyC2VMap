'use client'
import { ENDPOINT } from '@/services/endpoint'
import { Divider, Tooltip } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import './style.scss'
import { uniqBy } from 'lodash'
import { useAuth } from '@/providers/auth/index'
import { IMessage, ITypingUser } from '@/interface/common/index'
import { IGetRoomResponse, IParticipant } from '@/interface/response/room/index'
import { TypeDataRoom } from '@/interface/socket/index'
import { IGetMessagesRequest } from '@/interface/request/message/index'
import { RoomService } from '@/services/room/index'
import { MessageService } from '@/services/message/index'
import { IGetMessagesResponse } from '@/interface/response/message/index'
import { getImage, getUserById, trunMessage } from '@/utils/helpers/index'
import { ESocketEvent, IMAGE_TYPE, TIMEOUT_CALL } from '@/utils/constants/index'
import { ConversationItem } from '../RoomItem/index'
import WaitingCall from '@/components/callings/waitingCall/index'
import JitsiMeetingCall from '@/components/callings/jitsiMeetingCall/index'
import { AvatarGroupWrap } from '@/components/commons/AvatarGroupWrap/index'
import { AvatarWrap } from '@/components/commons/AvatarWrap/index'
import { DetailIcon } from '@/components/icons/DetailIcon/index'
import { TypingItem } from '../TypingItem/index'
import { AreaChat } from '../AreaChat/index'
import SidebarMenu from '@/modules/SidebarMenu/index'
import { ChatIcon } from '@/components/icons/ChatIcon/index'
import InfiniteScroll from 'react-infinite-scroll-component'
import moment from 'moment'
interface IProps {
  roomId: string
}

export const MessageContent: React.FC<IProps> = ({ roomId }) => {
    const { currentUser } = useAuth()
    const messagesEndRef = useRef<any>(null)
    const [isTyping, setIsTyping] = useState<boolean>(false)
    const [typingUsers, setTypingUsers] = useState<ITypingUser[]>([])
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [replyingTo, setReplyingTo] = useState<IMessage | null>(null)
    const [officialMessages, setOfficialMessages] = useState<IMessage[]>([])
    const [isStartCall, setIsStartCall] = useState<boolean>(false)
    const [isOpenMeeting, setIsOpenMeeting] = useState<boolean>(false)
    // current room selected
    const [roomCurrentSelected, setRoomCurrentSelected] = useState<IGetRoomResponse>()
    // data of room in talk
    const [roomTalkingInJitsi, setRoomTalkingInJitsi] = useState<TypeDataRoom>()
    const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null)
    const [searchMsgId, setSearchMsgId] = useState<string | null>(null)
    const [activeMessage, setActiveMessage] = useState<string>('')
    const [params, setParams] = useState<IGetMessagesRequest>({
        limit: 20,
        lastRecord: '',
        isJumpToMessages: false,
    })
    
    const { refetch: fetchRoomDetail } = useQuery(
        [ENDPOINT.ROOM.GET_ROOM_DETAIL],
        () => RoomService.getRoomDetail(roomId),
        {
        enabled: !!roomId,
            onSuccess: (response: any) => {
                const typingUserList = (response?.room?.participants ?? [])
                .map((user: any) => ({
                    ...user,
                    isTyping: false,
                }))
                .filter((other: any) => other._id !== currentUser?._id)
                setRoomCurrentSelected(response?.room)
                setTypingUsers(typingUserList)
                !isOpen && refetchRawMessages()
            },
        },
    )

    const { data: rawMessages, refetch: refetchRawMessages } = useQuery(
        [ENDPOINT.MESSAGE.GET_MESSAGES, roomId, params.lastRecord],
        () => MessageService.getMessages({ id: roomId, params }),
        {
            enabled: !!params && !!roomId && params.lastRecord !== null,
            onSuccess: (data: any) => {
                const dataApi =
                data &&
                data.data.map((message: IGetMessagesResponse) => {
                    const user = getUserById(
                        message.userId,
                        roomCurrentSelected?.participants || [],
                    )
                    return {
                        ...message,
                        user: user || null,
                    }
                })
                if (dataApi) {
                const resultData = params.isJumpToMessages
                    ? dataApi
                    : uniqBy([...officialMessages, ...dataApi], '_id')
                setOfficialMessages(resultData)
                setTimeout(() => {
                    const element = document.getElementById(
                    searchMsgId || dataApi[0]?._id,
                    )
                    if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'nearest',
                    })
                    }
                    if (searchMsgId) {
                    setSearchMsgId(null)
                    setParams({
                        ...params,
                        isJumpToMessages: false,
                    })
                    }
                }, 300)
                return
                }

                setParams({
                    ...params,
                    lastRecord: '',
                    isJumpToMessages: false,
                })
            },
        },
    )

    const onRedirectSearch = (e: any) => {
        setActiveMessage(e._id)
        setSearchMsgId(e?._id || null)
        setIsOpen(false)
        const elementTarget = document.getElementById(e?._id)
        if (elementTarget) {
            elementTarget.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
            })
            return
        }
        setParams({
            ...params,
            lastRecord: JSON.stringify(e._id),
            isJumpToMessages: true,
        })
    }

    /**
     * start call
     * @param roomId 
     */
    const onStartCall = (roomId: string) => {
        setIsStartCall(true)
        // send event start call to socket
    
        const timerIdCancel = setTimeout(() => {
            onCancelCall(roomId)
        }, TIMEOUT_CALL)
    
        setTimerId(timerIdCancel)
    }

    /**
     * end call
     */
    const onEndCall = (roomId: string) => {
        setIsOpenMeeting(false)
        setRoomTalkingInJitsi(undefined)
        // send event end call to socket
    }

    /**
     * cancel call
     * @param roomId 
     */
    const onCancelCall = (roomId: string) => {
        setIsStartCall(false)
        // send event cancel call to socket
        clearTimeout(timerId as unknown as number)
    }

    /**
     * Open room detail
     */
     const openRoomDetail = () => {
        setIsOpen((prevState) => !prevState)
        fetchRoomDetail()
    }

    /**
     * Close windown details
     */
    const closeRoomDetail = () =>  {
        setIsOpen(false)
    }

    const currentFriend = roomCurrentSelected?.participants?.find((person: IParticipant) => person?.userId !== currentUser?._id)
    const onGetMoreMsg = () => {
        setParams({
            ...params,
            lastRecord: JSON.stringify(
                officialMessages.length === 1
                ? officialMessages[officialMessages?.length - 1]._id
                : officialMessages[officialMessages?.length - 2]._id,
            ),
        })
    }
    const renderMessages = () => {
        let firstIndexToday = -1
        for (var i = officialMessages.length - 1; i >= 0; i--) {
            const message = officialMessages[i]
            if (
                new Date(message.createdAt).toDateString() === new Date().toDateString()
            ) {
                firstIndexToday = i
                break
            }
        }
        const groupDateObject = officialMessages.reduce(
            (
                target: Record<
                string,
                { date: string; messages: IGetMessagesResponse[] }
                >,
                message: IGetMessagesResponse,
            ) => {
                var messageDate = new Date(message.createdAt).toDateString()
                if (!target[messageDate]) {
                target[messageDate] = {
                    date: messageDate,
                    messages: [],
                }
                }
                target[messageDate].messages.push(message)
                return target
            }, {},
        )
        const result: { date: string; messages: IGetMessagesResponse[] }[] =
        Object.values(groupDateObject)
        const participants = roomCurrentSelected?.participants
            ?.filter((other: any) => other._id !== currentUser?._id)
            .map((e: any) => ({
                ...e,
                customIndexRead: roomCurrentSelected.totalMessage - e.indexMessageRead,
            })
        ) || []
        let indexMessage = -1
        return result.map((messageGroup, indexGroup) => {
            return (
                <div key={indexGroup}>
                    <div className='time-group'>
                        <Divider>
                        {new Date().toDateString() == messageGroup.date
                            ? 'Today'
                            : moment(messageGroup.date).format('YYYY-MM-DD')}
                        </Divider>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column-reverse',
                            gap: '25px',
                        }}
                    >
                        {messageGroup.messages.map((message, index) => {
                        indexMessage++
                            return (
                                <div key={message._id} id={message._id}>
                                    <ConversationItem
                                        index={indexMessage}
                                        data={message}
                                        isMe={currentUser?._id === message?.userId}
                                        isLastMsg={indexMessage === 0}
                                        participants={participants}
                                        isShowName={roomCurrentSelected?.isGroup}
                                        setReplyingTo={setReplyingTo}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        })
    }

    const renderContent = () => {
        if (roomId) {
            return (
                <>
                {roomCurrentSelected && (
                    <WaitingCall
                        room={roomCurrentSelected}
                        isOpen={isStartCall}
                        onCancel={() => onCancelCall(roomId)}
                    ></WaitingCall>
                )}

                {roomTalkingInJitsi && (
                    <JitsiMeetingCall
                        roomNameJitsi={roomTalkingInJitsi.roomName}
                        tokenJitsi={roomTalkingInJitsi.token}
                        onCancel={() => onEndCall(roomTalkingInJitsi.room._id)}
                        isOpen={isOpenMeeting}
                    />
                )}
                
                {
                    /**
                     * header of chat detail
                     */
                }
                <div className='header header-msg'>
                    <div className='user-info'>
                    {roomCurrentSelected?.isGroup && !roomCurrentSelected?.avatarUrl ? (
                        <AvatarGroupWrap
                        users={roomCurrentSelected?.participants}
                        isOnline={roomCurrentSelected?.hasOnline}
                        />
                    ) : (
                        <AvatarWrap
                        size={48}
                        isOnline={roomCurrentSelected?.hasOnline}
                        src={
                            roomCurrentSelected?.avatarUrl ||
                            getImage(currentFriend?.avatarUrl!, IMAGE_TYPE.AVATAR)
                        }
                        />
                    )}
                    <div className='user-info--right'>
                        {roomCurrentSelected?.isGroup ? (
                        <span className='name'>
                            {trunMessage(roomCurrentSelected?.name, 40)}
                        </span>
                        ) : (
                        <span className='name'>
                            {trunMessage(currentFriend?.username || '', 40)}
                        </span>
                        )}
                        {!roomCurrentSelected?.isGroup &&
                            (roomCurrentSelected?.hasOnline ? (
                                <span className='status'>Online</span>
                            ) : (
                                <span className='status'>Offline</span>
                            ))
                        }
                    </div>
                    </div>
                    <div className='actions'>
                        <Tooltip title='Voice Call'>
                            <div className='voice-call' onClick={()=> onStartCall(roomId)}>
                            <img src='/icons/voice-call.svg' alt='call-video' />
                            </div>
                        </Tooltip>
                        <Tooltip title='Detail'>
                            <div className='voice-call' onClick={()=> openRoomDetail()}>
                            <DetailIcon />
                            </div>
                        </Tooltip>
                    </div>
                </div>
                <div
                    className='content'
                    id='scrollableDiv'
                    style={{
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column-reverse',
                    }}
                >
                    <InfiniteScroll
                    dataLength={Number(officialMessages?.length) || 0}
                    next={onGetMoreMsg}
                    style={{
                        display: 'flex',
                        flexDirection: 'column-reverse',
                        gap: '12px',
                        padding: '0 10px',
                        overflowX: 'hidden',
                        marginTop: '10px',
                    }}
                    inverse={true}
                    hasMore={rawMessages?.data?.nextCursor !== null}
                    loader={<h4>Loading...</h4>}
                    scrollableTarget='scrollableDiv'
                    ref={messagesEndRef}
                    >
                    <>
                        {typingUsers?.map(
                        (other, index) =>
                            other?.isTyping && <TypingItem key={index} data={other!} />,
                        )}
                        {renderMessages()}
                    </>
                    </InfiniteScroll>
                </div>
                <AreaChat
                    isTyping={isTyping}
                    setIsTyping={setIsTyping}
                    roomId={roomId}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                />
                {isOpen && (
                    <SidebarMenu
                        open={isOpen}
                        cancel={closeRoomDetail}
                        handleRedirectSearch={onRedirectSearch}
                        setRoomCurrentSelected={setRoomCurrentSelected}
                        roomDetail={roomCurrentSelected!}
                        avatarUrl={
                            roomCurrentSelected?.isGroup && !roomCurrentSelected?.avatarUrl ? (
                            <AvatarGroupWrap
                                users={roomCurrentSelected?.participants}
                                isOnline={roomCurrentSelected?.hasOnline}
                            />
                            ) : (
                            <AvatarWrap
                                size={48}
                                isOnline={roomCurrentSelected?.hasOnline}
                                src={
                                    roomCurrentSelected?.avatarUrl ||
                                    getImage(currentFriend?.avatarUrl!, IMAGE_TYPE.AVATAR)
                                }
                            />
                            )
                        }
                        name={
                            roomCurrentSelected?.isGroup
                            ? roomCurrentSelected?.name
                            : currentFriend?.username
                        }
                        status={
                            !roomCurrentSelected?.isGroup &&
                            (roomCurrentSelected?.hasOnline ? (
                            <span className='status'>Online</span>
                            ) : (
                            <span className='status'>Offline</span>
                            ))
                        }
                        refresh={() => fetchRoomDetail()}
                    />
                )}
                </>
            )
        }
        return (
        <div className='no-chat-selected'>
            <ChatIcon width={100} height={100} />
            <span className='note'>No chat selected yet</span>
        </div>
        )
    }

    useEffect(() => {
        const elementActive = document.getElementById(activeMessage)
        if (elementActive) {
            setActiveMessage('')
            elementActive?.classList.add('active')
            setTimeout(() => { elementActive?.classList.remove('active') }, 3000)
        }
    }, [activeMessage, rawMessages])

    return (
        <div className='c-message-content'>
            <div className='content-wrapper'>{renderContent()}</div>
        </div>
    )
}
