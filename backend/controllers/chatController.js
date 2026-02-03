import prisma from '../config/database.js';
import chatService from '../services/geminiService.js';

export const handleChat = async (req, res) => {
  try {
    const { query, conversationId } = req.body;
    const userId = req.userId;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    console.log('💬 Chat request - User:', userId, 'Conversation:', conversationId);

    let conversation;

    if (conversationId) {
      // Find existing conversation
      conversation = await prisma.conversation.findFirst({
        where: {
          id: parseInt(conversationId),
          userId: userId
        }
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Update timestamp
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() }
      });
    } else {
      // Create new conversation
      const title = query.length > 50 ? query.substring(0, 50) + '...' : query;
      
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title
        }
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        userId,
        conversationId: conversation.id,
        role: 'USER',
        text: query
      }
    });


    // Generate AI response
    const answer = await chatService(query);

    // Save bot response
    await prisma.message.create({
      data: {
        userId,
        conversationId: conversation.id,
        role: 'BOT',
        text: answer
      }
    });

    console.log('✅ Response generated and saved');

    res.json({ 
      answer,
      conversationId: conversation.id 
    });
  } catch (err) {
    console.error('❌ Chat error:', err);
    res.status(500).json({ error: 'Failed to process chat' });
  }
};


export const getConversations = async (req, res) => {
  try {
    const userId = req.userId;
    console.log('📊 Fetching conversations for userId:', userId, 'Type:', typeof userId);

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    const conversationsWithCount = conversations.map(conv => ({
      conversationId: conv.id,
      title: conv.title,
      messageCount: conv._count.messages,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt
    }));

    console.log(`📜 Fetched ${conversationsWithCount.length} conversations`);

    res.json({ conversations: conversationsWithCount });
  } catch (error) {
    console.error('❌ Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: parseInt(conversationId),
        userId: userId
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const history = await prisma.message.findMany({
      where: { conversationId: parseInt(conversationId) },
      orderBy: { timestamp: 'asc' }
    });

    // Map to frontend format
    const formattedHistory = history.map(msg => ({
      role: msg.role.toLowerCase(),
      text: msg.text,
      timestamp: msg.timestamp
    }));

    console.log(`📜 Fetched ${formattedHistory.length} messages`);

    res.json({ history: formattedHistory });
  } catch (error) {
    console.error('❌ Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

export const clearConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: parseInt(conversationId),
        userId: userId
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete conversation (messages cascade delete automatically)
    await prisma.conversation.delete({
      where: { id: parseInt(conversationId) }
    });

    console.log(`🗑️ Deleted conversation ${conversationId}`);

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('❌ Clear conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};

export const renameConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;
    const userId = req.userId;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: parseInt(conversationId),
        userId: userId
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Update title
    const updated = await prisma.conversation.update({
      where: { id: parseInt(conversationId) },
      data: { title: title.trim() }
    });

    res.json({ 
      message: 'Conversation renamed successfully',
      conversation: updated
    });
  } catch (error) {
    console.error('❌ Rename conversation error:', error);
    res.status(500).json({ error: 'Failed to rename conversation' });
  }
};

