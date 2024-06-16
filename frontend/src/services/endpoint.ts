export const ENDPOINT = {
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: 'auth/logout',
        GET_ME: 'profile',
    },
    ROOM: {
        GET_ROOMS: 'rooms',
        GET_ROOM_DETAIL: 'rooms/:id',
        CREATE_ROOM: 'rooms',
        INVITES_TO_ROOM: 'rooms/:id/invites',
        TEST_CALL: 'rooms/test-call',
        UPDATE_ROOM: 'rooms/:id',
        UPDATE_ROOM_NAME: 'rooms/:id/name',
        UPDATE_ROOM_AVATAR: 'rooms/:id/avatar',
    },
    USER: {
        GET_USERS: 'users',
    },
    MESSAGE: {
        GET_MESSAGES: 'messages/room/:id',
    },
    UPLOAD: {
        UPLOAD_MEDIA: 'files/upload',
    },
}
