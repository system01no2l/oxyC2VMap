import {
    Controller,
    Get,
    Query,
    Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MessageService } from './message.service';
import { QueryMessageDto } from './dto/query-message.dto';
import { ResMessageDto } from './dto/response.message.dto';

@Controller({ path: 'messages', scope: Scope.REQUEST })
export class MessageController {
    constructor(private messageService: MessageService) { }

    @Get('/api/room/:roomId/messages')
    getAllPosts(
        @Query() query?: QueryMessageDto
    ): Observable<ResMessageDto[]> {
        return this.messageService.findAll(query);
    }
}
