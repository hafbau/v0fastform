import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock the database connection
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}

vi.mock('../../lib/db/connection', () => ({
  getDb: () => mockDb,
}))

vi.mock('../../lib/db/utils', () => ({
  generateHashedPassword: (p: string) => `hashed_${p}`,
}))

vi.mock('../../lib/utils', () => ({
  generateUUID: () => 'mock-uuid-123',
}))

describe('Database Queries - camelCase verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('imports', () => {
    it('should import camelCase table names from schema', async () => {
      // This test verifies that the imports use camelCase names
      // If the imports were snake_case, this would fail at compile time
      const queries = await import('../../lib/db/queries')

      // Verify the module exports the expected functions
      expect(queries.createChatOwnership).toBeDefined()
      expect(queries.getChatOwnership).toBeDefined()
      expect(queries.getChatIdsByUserId).toBeDefined()
      expect(queries.deleteChatOwnership).toBeDefined()
      expect(queries.getChatCountByUserId).toBeDefined()
      expect(queries.getChatCountByIP).toBeDefined()
      expect(queries.createAnonymousChatLog).toBeDefined()
    })
  })

  describe('createChatOwnership', () => {
    it('should use camelCase column names in values', async () => {
      const { createChatOwnership } = await import('../../lib/db/queries')

      mockDb.returning.mockResolvedValueOnce([{ id: '1' }])

      await createChatOwnership({
        v0ChatId: 'chat-123',
        userId: 'user-456',
      })

      // Verify insert was called
      expect(mockDb.insert).toHaveBeenCalled()

      // Verify values uses camelCase keys
      expect(mockDb.values).toHaveBeenCalledWith({
        v0ChatId: 'chat-123',
        userId: 'user-456',
      })
    })
  })

  describe('createAnonymousChatLog', () => {
    it('should use camelCase column names in values', async () => {
      const { createAnonymousChatLog } = await import('../../lib/db/queries')

      mockDb.values.mockResolvedValueOnce([{ id: '1' }])

      await createAnonymousChatLog({
        ipAddress: '192.168.1.1',
        v0ChatId: 'chat-789',
      })

      // Verify values uses camelCase keys
      expect(mockDb.values).toHaveBeenCalledWith({
        ipAddress: '192.168.1.1',
        v0ChatId: 'chat-789',
      })
    })
  })
})
