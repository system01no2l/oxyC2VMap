import {
    Controller,
    Get,
    Param,
    Query,
    Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MessageService } from './message.service';
import { QueryMessageDto } from './dto/query-message.dto';
import { Message } from '../../database/schemas/message.schema';
import { ParseObjectIdPipe } from '../../shared/pipe/parse-object-id.pipe';
import { MessageDto } from './dto/response.message.dto';

@Controller({ path: 'messages', scope: Scope.REQUEST })
export class MessageController {
    constructor(private messageService: MessageService) { }

    @Get('/room/:roomId')
    getAllPosts(
        @Param('roomId', ParseObjectIdPipe) roomId: string,
        @Query() query?: QueryMessageDto,
    ): Observable<{ data: Partial<Message[]>; status: string }> {
        return this.messageService.findAll(query, roomId);
    }

    @Get('/room/:roomId/media/:type')
    getSummaryMessageByRoom(
        @Param('roomId', ParseObjectIdPipe) roomId: string,
        @Param('type') type: string,
    ): Observable<{ data: MessageDto[] }> {
        return this.messageService.getSummaryMessageByRoom(roomId, type);
    }
}
