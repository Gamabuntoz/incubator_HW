import {Request, Response, Router} from "express";
import {commentsType} from "../db/types";
import {sendStatus} from "../db/status-collection";
import {
    inputCommentsValidation,
    inputValidationErrors
} from "../middlewares/input-validation-middleware";
import {ObjectId} from "mongodb";
import {commentsService} from "./comments-service";
import {commentsRepository} from "./comments-repository";
import {authMiddlewareBearer} from "../middlewares/authorization-middleware";

export const commentsRouter = Router()

commentsRouter.get("/:id", async (req: Request, res: Response) => {
    let commentId: ObjectId;
    try {
        commentId = new ObjectId(req.params.id)
    } catch (e) {
        res.sendStatus(sendStatus.NOT_FOUND_404)
        return false
    }
    const findCommentById: commentsType | boolean | null = await commentsService
        .findCommentById(commentId)
    if (!findCommentById) {
        res.sendStatus(sendStatus.NOT_FOUND_404)
        return
    }
    res.status(sendStatus.OK_200).send(findCommentById)
})
commentsRouter.put("/:id",
    authMiddlewareBearer,
    inputCommentsValidation.content,
    inputValidationErrors,
    async (req: Request, res: Response) => {
        let commentId: ObjectId;
        try {
            commentId = new ObjectId(req.params.id)
        } catch (e) {
            res.sendStatus(sendStatus.NOT_FOUND_404)
            return false
        }
        const findComment: commentsType | null = await commentsRepository.findComment(commentId)
        if (!findComment) {
            return res.sendStatus(sendStatus.NOT_FOUND_404)
        }
        if (req.user!.id !== findComment.commentatorInfo.userId) {
            return res.sendStatus(sendStatus.FORBIDDEN_403)
        }
        const content = req.body.content
        const updateComment: commentsType | boolean = await commentsService.updateComment(content, commentId.toString())
        if (!updateComment) {
            return res.sendStatus(sendStatus.NOT_FOUND_404)
        }
        res.sendStatus(sendStatus.NO_CONTENT_204)
    })
commentsRouter.delete("/:id",
    authMiddlewareBearer,
    async (req: Request, res: Response) => {
        let commentId: ObjectId;
        try {
            commentId = new ObjectId(req.params.id)
        } catch (e) {
            res.sendStatus(sendStatus.NOT_FOUND_404)
            return false
        }
        const findComment: commentsType | null = await commentsRepository.findComment(commentId)
        if (!findComment) {
            return res.sendStatus(sendStatus.NOT_FOUND_404)
        }
        if (req.user!.id !== findComment.commentatorInfo.userId) {
            return res.sendStatus(sendStatus.FORBIDDEN_403)
        }
        const foundComment = await commentsService.deleteComment(commentId)
        if (!foundComment) {
            return res.sendStatus(sendStatus.NOT_FOUND_404)
        }
        res.sendStatus(sendStatus.NO_CONTENT_204)
    })