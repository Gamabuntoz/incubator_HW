import {usersRepository} from "./users-repository";
import {ObjectId} from "mongodb";
import {findUsersType, usersType} from "../db/types";
import bcrypt from "bcrypt"
import {usersCollection} from "../db/db"

export const usersService ={
    async findUserById(userId: ObjectId): Promise<usersType | null> {
        const result = await usersCollection.findOne({_id: userId})
        if (!result) {
            return null
        }
        return {
            id: result._id!.toString(),
            login: result.login,
            email: result.email,
            createdAt: result.createdAt
        }
    },
    async findAllUsers(sortBy: string | undefined, sortDirection: string | undefined, pageNumber: number, pageSize: number, searchLoginTerm: string, searchEmailTerm: string): Promise<findUsersType> {
        let filter = {}
        if (searchLoginTerm || searchEmailTerm) {
            filter = {$or: [{login: {$regex: searchLoginTerm, $options: "$i"}}, {email: {$regex: searchEmailTerm, $options: "$i"}}]}
        }
        let sort = "createdAt"
        if (sortBy) {
            sort = sortBy
        }
        const totalCount = await usersCollection.countDocuments(filter)
        const findAll = await usersCollection
            .find(filter)
            .sort({[sort]: sortDirection === "asc" ? 1 : -1})
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            .toArray()
        return {
            pagesCount: Math.ceil(totalCount / pageSize),
            page: pageNumber,
            pageSize: pageSize,
            totalCount: totalCount,
            items: findAll.map(u => ({
                    id: u._id!.toString(),
                    login: u.login,
                    email: u.email,
                    createdAt: u.createdAt
                })
            )
        }
    },
    async createUser(login: string, password: string, email: string): Promise<usersType | null> {
        const passwordSalt = await bcrypt.genSalt(10)
        const passwordHash = await this._generateHash(password, passwordSalt)
        const newUser: usersType = {
            _id: new ObjectId(),
            login: login,
            email: email,
            passwordHash: passwordHash,
            createdAt: new Date().toISOString(),
        }
        const result = await usersRepository.createUser(newUser)
        return {
            id: result._id!.toString(),
            login: result.login,
            email: result.email,
            createdAt: result.createdAt
        }
    },
    async deleteUser(id: string): Promise<boolean> {
        let userId: ObjectId;
        try {
            userId = new ObjectId(id)
        } catch (e) {
            console.log(e)
            return false
        }
        return usersRepository.deleteUser(userId)
    },
    async deleteAllUsers(): Promise<boolean> {
        return usersRepository.deleteAllUsers()
    },
    async checkCredentials(loginOrEmail: string, password: string): Promise<usersType | boolean> {
        const user = await usersRepository.findByLoginOrEmail(loginOrEmail)
        if (!user) return false
        const passwordHash = await this._generateHash(password, user.passwordHash!.slice(0, 29))
        if (user.passwordHash !== passwordHash) {
            return false
        }
        return user
    },
    async _generateHash(password: string, salt: string) {
        return await bcrypt.hash(password, salt)
    }
}