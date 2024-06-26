import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { EMPTY, from, Observable, of } from 'rxjs';
import { mergeMap, throwIfEmpty, map } from 'rxjs/operators';
import { RoleType } from '../../shared/enum/role-type.enum';
import { USER_MODEL } from '../../database/constants';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class UserService {
    constructor(
        @Inject(USER_MODEL) private userModel: Model<UserDocument>,
    ) { }

    findByUsername(username: string): Observable<User> {
        return from(this.userModel.findOne({ username }).exec());
    }

    /**
     * Get info user
     * @param username 
     * @returns 
     */
    findByAuthReq(username: string): Observable<{ data: Partial<User>; status: string }> {
        return from(this.userModel.findOne({ username }).exec()).pipe(
            map(user => {
                if (!user) {
                    throw new Error('User not found');
                }
                return {
                    data: {
                        _id: user._id,
                        username: user.username,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        avatar: user.avatar,
                        roles: user.roles
                    },
                    status: 'ok'
                };
            })
        );
    }

    /**
     * Get all users
     * @returns 
     */
    findAll(): Observable<{ users: Partial<User>[] }> {
        return from(this.userModel.find().exec()).pipe(
            map(_users => ({
                users: _users.map(user => ({
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    avatar: user.avatar,
                }))
            }))
        );
    }

    findByUserId(id: string): Promise<User> {
        return this.userModel.findOne({ _id: id }).exec();
    }

    existsByUsername(username: string): Observable<boolean> {
        return from(this.userModel.exists({ username }).exec()).pipe(
            map((exists) => exists != null),
        );
    }

    existsByEmail(email: string): Observable<boolean> {
        return from(this.userModel.exists({ email }).exec()).pipe(
            map((exists) => exists != null),
        );
    }

    register(data: RegisterDto): Observable<User> {
        return from(this.userModel.create({
            ...data,
            roles: [RoleType.USER],
        }));
    }

    findById(id: string, withPosts = false): Observable<User> {
        const userQuery = this.userModel.findOne({ _id: id });
        if (withPosts) {
            userQuery.populate('posts');
        }
        return from(userQuery.exec()).pipe(
            mergeMap((p) => (p ? of(p) : EMPTY)),
            throwIfEmpty(() => new NotFoundException(`user:${id} was not found`)),
        );
    }
}
