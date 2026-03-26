import express, { type Request, type Response } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import { MessageModel } from '../models/Message.js'
import { UserModel } from '../models/User.js'

export const messageRoutes = express.Router()

// Send a new message (admin only)
messageRoutes.post('/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.sub
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    const user = await UserModel.findById(userId)

    if (!user || user.role !== 1) {
      return res.status(403).json({ message: 'Only admins can send messages' })
    }

    const { title, content, messageType, recipientIds } = req.body

    if (!title || !content || !messageType || !recipientIds || recipientIds.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const message = await MessageModel.create({
      senderId: userId,
      senderName: user.fullName,
      title,
      content,
      messageType,
      recipientIds: recipientIds.map((id: string) => new mongoose.Types.ObjectId(id)),
      status: 'Sent',
      readBy: [],
    })

    return res.status(201).json({
      message: 'Message sent successfully',
      data: message.toObject(),
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return res.status(500).json({ message: 'Failed to send message' })
  }
})

// Get messages for current user (with read status)
messageRoutes.get('/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const authId = req.auth?.sub
    if (!authId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    const userId = new mongoose.Types.ObjectId(authId)

    const messages = await MessageModel.find({
      recipientIds: userId,
    })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean()

    const messagesWithReadStatus = messages.map((msg) => ({
      ...msg,
      isRead: msg.readBy.some((id) => new mongoose.Types.ObjectId(id).equals(userId)),
    }))

    return res.json({ data: messagesWithReadStatus })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return res.status(500).json({ message: 'Failed to fetch messages' })
  }
})

// Get all messages sent by admin (admin only)
messageRoutes.get('/messages/admin/sent', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.sub
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    const user = await UserModel.findById(userId)

    if (!user || user.role !== 1) {
      return res.status(403).json({ message: 'Only admins can view sent messages' })
    }

    const messages = await MessageModel.find({ senderId: userId })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean()

    return res.json({ data: messages })
  } catch (error) {
    console.error('Error fetching sent messages:', error)
    return res.status(500).json({ message: 'Failed to fetch sent messages' })
  }
})

// Mark message as read
messageRoutes.patch('/messages/:messageId/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const authId = req.auth?.sub
    if (!authId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    const userId = new mongoose.Types.ObjectId(authId)
    const { messageId } = req.params

    const message = await MessageModel.findById(messageId)
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    // Check if user is recipient
    const isRecipient = message.recipientIds.some((id) => new mongoose.Types.ObjectId(id).equals(userId))
    if (!isRecipient) {
      return res.status(403).json({ message: 'Not authorized to read this message' })
    }

    // Add to readBy if not already read
    if (!message.readBy.some((id) => new mongoose.Types.ObjectId(id).equals(userId))) {
      message.readBy.push(userId)
      await message.save()
    }

    return res.json({ message: 'Message marked as read' })
  } catch (error) {
    console.error('Error marking message as read:', error)
    return res.status(500).json({ message: 'Failed to mark message as read' })
  }
})

// Delete message for user (soft delete by removing from recipient list)
messageRoutes.delete('/messages/:messageId', requireAuth, async (req: Request, res: Response) => {
  try {
    const authId = req.auth?.sub
    if (!authId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    const userId = new mongoose.Types.ObjectId(authId)
    const { messageId } = req.params

    const message = await MessageModel.findById(messageId)
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    // Check if user is recipient
    const isRecipient = message.recipientIds.some((id) => new mongoose.Types.ObjectId(id).equals(userId))
    const isSender = new mongoose.Types.ObjectId(message.senderId).equals(userId)
    const isAdmin = req.auth?.role === 1
    if (!isRecipient && !isSender && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this message' })
    }

    if (isSender || isAdmin) {
      await MessageModel.findByIdAndDelete(messageId)
      return res.json({ message: 'Message deleted' })
    }

    // Recipient delete is soft-delete (only for their own inbox)
    message.recipientIds = message.recipientIds.filter((id) => !new mongoose.Types.ObjectId(id).equals(userId))
    message.readBy = message.readBy.filter((id) => !new mongoose.Types.ObjectId(id).equals(userId))

    if (message.recipientIds.length === 0) message.status = 'Archived'

    await message.save()

    return res.json({ message: 'Message deleted' })
  } catch (error) {
    console.error('Error deleting message:', error)
    return res.status(500).json({ message: 'Failed to delete message' })
  }
})

// Get all users (for selecting recipients when composing message)
messageRoutes.get('/messages/recipients/all', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.sub
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    const user = await UserModel.findById(userId)

    if (!user || user.role !== 1) {
      return res.status(403).json({ message: 'Only admins can view recipient list' })
    }

    const users = await UserModel.find({ _id: { $ne: userId } })
      .select('_id fullName email role')
      .sort({ fullName: 1 })
      .lean()

    return res.json({ data: users })
  } catch (error) {
    console.error('Error fetching recipients:', error)
    return res.status(500).json({ message: 'Failed to fetch recipients' })
  }
})
