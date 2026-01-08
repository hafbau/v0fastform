import { describe, it, expect } from 'vitest'
import { generateHeuristicName } from './app-naming'

describe('generateHeuristicName', () => {
  describe('prefix stripping', () => {
    it('should strip "I need a" prefix', () => {
      const result = generateHeuristicName('I need a task manager app')
      expect(result.name).toBe('Task Manager App')
      expect(result.slug).toBe('task-manager-app')
    })

    it('should strip "I need an" prefix', () => {
      const result = generateHeuristicName('I need an expense tracker')
      expect(result.name).toBe('Expense Tracker')
      expect(result.slug).toBe('expense-tracker')
    })

    it('should strip "Build me a" prefix', () => {
      const result = generateHeuristicName('Build me a todo list')
      expect(result.name).toBe('Todo List')
      expect(result.slug).toBe('todo-list')
    })

    it('should strip "Build me an" prefix', () => {
      const result = generateHeuristicName('Build me an inventory system')
      expect(result.name).toBe('Inventory System')
      expect(result.slug).toBe('inventory-system')
    })

    it('should strip "Create a" prefix', () => {
      const result = generateHeuristicName('Create a blog platform')
      expect(result.name).toBe('Blog Platform')
      expect(result.slug).toBe('blog-platform')
    })

    it('should strip "Create an" prefix', () => {
      const result = generateHeuristicName('Create an online store')
      expect(result.name).toBe('Online Store')
      expect(result.slug).toBe('online-store')
    })

    it('should strip "Make me a" prefix', () => {
      const result = generateHeuristicName('Make me a contact form')
      expect(result.name).toBe('Contact Form')
      expect(result.slug).toBe('contact-form')
    })

    it('should strip "Make me an" prefix', () => {
      const result = generateHeuristicName('Make me an event calendar')
      expect(result.name).toBe('Event Calendar')
      expect(result.slug).toBe('event-calendar')
    })

    it('should strip "I want a" prefix', () => {
      const result = generateHeuristicName('I want a music player')
      expect(result.name).toBe('Music Player')
      expect(result.slug).toBe('music-player')
    })

    it('should strip "I want an" prefix', () => {
      const result = generateHeuristicName('I want an analytics dashboard')
      expect(result.name).toBe('Analytics Dashboard')
      expect(result.slug).toBe('analytics-dashboard')
    })

    it('should handle case-insensitive prefix matching', () => {
      const result = generateHeuristicName('i NEED a Weather App')
      expect(result.name).toBe('Weather App')
      expect(result.slug).toBe('weather-app')
    })

    it('should not strip partial prefix matches', () => {
      const result = generateHeuristicName('need a special app')
      expect(result.name).toBe('Need A Special App')
      expect(result.slug).toBe('need-a-special-app')
    })
  })

  describe('title casing', () => {
    it('should convert lowercase to title case', () => {
      const result = generateHeuristicName('task manager')
      expect(result.name).toBe('Task Manager')
    })

    it('should preserve already title-cased words', () => {
      const result = generateHeuristicName('Task Manager App')
      expect(result.name).toBe('Task Manager App')
    })

    it('should handle mixed case input', () => {
      const result = generateHeuristicName('tAsK mAnAgEr')
      expect(result.name).toBe('Task Manager')
    })

    it('should handle single word', () => {
      const result = generateHeuristicName('dashboard')
      expect(result.name).toBe('Dashboard')
    })

    it('should handle uppercase input', () => {
      const result = generateHeuristicName('TODO LIST APP')
      expect(result.name).toBe('Todo List App')
    })
  })

  describe('slugification', () => {
    it('should convert to lowercase with hyphens', () => {
      const result = generateHeuristicName('Task Manager App')
      expect(result.slug).toBe('task-manager-app')
    })

    it('should remove special characters', () => {
      const result = generateHeuristicName('Task & Event Manager!')
      expect(result.slug).toBe('task-event-manager')
    })

    it('should handle multiple spaces', () => {
      const result = generateHeuristicName('Task    Manager    App')
      expect(result.slug).toBe('task-manager-app')
    })

    it('should handle leading/trailing spaces', () => {
      const result = generateHeuristicName('  Task Manager  ')
      expect(result.slug).toBe('task-manager')
    })

    it('should handle special characters: @#$%^&*()', () => {
      const result = generateHeuristicName('App@#$%Name')
      expect(result.slug).toBe('app-name')
    })

    it('should handle punctuation', () => {
      const result = generateHeuristicName("User's To-Do List, v2.0!")
      expect(result.slug).toBe('user-s-to-do-list-v2-0')
    })

    it('should handle underscores', () => {
      const result = generateHeuristicName('my_task_manager')
      expect(result.slug).toBe('my-task-manager')
    })

    it('should handle multiple consecutive hyphens', () => {
      const result = generateHeuristicName('Task --- Manager')
      expect(result.slug).toBe('task-manager')
    })

    it('should remove leading/trailing hyphens', () => {
      const result = generateHeuristicName('---Task Manager---')
      expect(result.slug).toBe('task-manager')
    })

    it('should handle dots and commas', () => {
      const result = generateHeuristicName('Task.Manager,App')
      expect(result.slug).toBe('task-manager-app')
    })

    it('should handle unicode characters', () => {
      const result = generateHeuristicName('Tâsk Mänager')
      expect(result.slug).toBe('task-manager')
    })

    it('should handle emojis', () => {
      const result = generateHeuristicName('Task Manager 🚀 App')
      expect(result.slug).toBe('task-manager-app')
    })
  })

  describe('truncation', () => {
    it('should truncate name to 50 characters', () => {
      const longName = 'A' + 'B'.repeat(100)
      const result = generateHeuristicName(longName)
      expect(result.name.length).toBeLessThanOrEqual(50)
    })

    it('should truncate slug to 30 characters', () => {
      const longName = 'word-' + 'test-'.repeat(20)
      const result = generateHeuristicName(longName)
      expect(result.slug.length).toBeLessThanOrEqual(30)
    })

    it('should not add ellipsis to name within limit', () => {
      const result = generateHeuristicName('Task Manager')
      expect(result.name).not.toContain('...')
    })

    it('should add ellipsis to truncated name', () => {
      const longName = 'This Is A Very Long Application Name That Exceeds The Fifty Character Limit'
      const result = generateHeuristicName(longName)
      expect(result.name).toContain('...')
    })

    it('should truncate at word boundary for names', () => {
      const longName = 'This Is A Very Long Application Name That Should Be Truncated At Word Boundary'
      const result = generateHeuristicName(longName)
      // Should truncate and add ellipsis
      expect(result.name.length).toBeLessThanOrEqual(50)
      expect(result.name).toContain('...')
      // Should not end with a space before ellipsis
      expect(result.name).not.toMatch(/\s\.\.\.$/)
    })

    it('should handle slug truncation cleanly', () => {
      const longName = 'this-is-a-very-long-slug-that-should-be-truncated-to-thirty-characters-maximum'
      const result = generateHeuristicName(longName)
      expect(result.slug.endsWith('-')).toBe(false)
      expect(result.slug.length).toBeLessThanOrEqual(30)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = generateHeuristicName('')
      expect(result.name).toBe('Untitled App')
      expect(result.slug).toBe('untitled-app')
    })

    it('should handle whitespace-only string', () => {
      const result = generateHeuristicName('   ')
      expect(result.name).toBe('Untitled App')
      expect(result.slug).toBe('untitled-app')
    })

    it('should handle very short input', () => {
      const result = generateHeuristicName('ab')
      expect(result.name).toBe('Ab')
      expect(result.slug).toBe('ab')
    })

    it('should handle single character after prefix strip', () => {
      const result = generateHeuristicName('I need a x')
      expect(result.name).toBe('X')
      expect(result.slug).toBe('x')
    })

    it('should handle numbers', () => {
      const result = generateHeuristicName('app 123 version 2')
      expect(result.name).toBe('App 123 Version 2')
      expect(result.slug).toBe('app-123-version-2')
    })

    it('should handle prefix-only input', () => {
      const result = generateHeuristicName('I need a')
      expect(result.name).toBe('Untitled App')
      expect(result.slug).toBe('untitled-app')
    })

    it('should handle prefix with trailing spaces', () => {
      const result = generateHeuristicName('Create a   ')
      expect(result.name).toBe('Untitled App')
      expect(result.slug).toBe('untitled-app')
    })

    it('should handle only special characters', () => {
      const result = generateHeuristicName('!@#$%^&*()')
      expect(result.name).toBe('Untitled App')
      expect(result.slug).toBe('untitled-app')
    })

    it('should handle newlines and tabs', () => {
      const result = generateHeuristicName('Task\nManager\tApp')
      expect(result.name).toBe('Task Manager App')
      expect(result.slug).toBe('task-manager-app')
    })
  })

  describe('integration scenarios', () => {
    it('should handle realistic user input 1', () => {
      const result = generateHeuristicName('I need a simple todo list app')
      expect(result.name).toBe('Simple Todo List App')
      expect(result.slug).toBe('simple-todo-list-app')
    })

    it('should handle realistic user input 2', () => {
      const result = generateHeuristicName('Build me an e-commerce platform with shopping cart')
      expect(result.name).toBe('E-commerce Platform With Shopping Cart')
      // Slug truncated to 30 chars
      expect(result.slug.length).toBeLessThanOrEqual(30)
      expect(result.slug).toMatch(/^e-commerce-platform-with/)
    })

    it('should handle realistic user input 3', () => {
      const result = generateHeuristicName('Create a RESTful API for user authentication')
      expect(result.name).toBe('Restful Api For User Authentication')
      // Slug truncated to 30 chars
      expect(result.slug.length).toBeLessThanOrEqual(30)
      expect(result.slug).toMatch(/^restful-api-for-user/)
    })

    it('should handle realistic user input 4', () => {
      const result = generateHeuristicName('blog with markdown support')
      expect(result.name).toBe('Blog With Markdown Support')
      expect(result.slug).toBe('blog-with-markdown-support')
    })

    it('should handle realistic user input 5', () => {
      const result = generateHeuristicName('I want an admin dashboard for managing users & permissions')
      expect(result.name).toBe('Admin Dashboard For Managing Users & Permissions')
      // Slug truncated to 30 chars
      expect(result.slug.length).toBeLessThanOrEqual(30)
      expect(result.slug).toMatch(/^admin-dashboard-for/)
    })
  })

  describe('consistency', () => {
    it('should produce consistent results for same input', () => {
      const input = 'Task Manager App'
      const result1 = generateHeuristicName(input)
      const result2 = generateHeuristicName(input)
      expect(result1).toEqual(result2)
    })

    it('should always return both name and slug', () => {
      const result = generateHeuristicName('test app')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('slug')
      expect(typeof result.name).toBe('string')
      expect(typeof result.slug).toBe('string')
    })

    it('should never return undefined or null', () => {
      const result = generateHeuristicName('')
      expect(result.name).toBeDefined()
      expect(result.slug).toBeDefined()
      expect(result.name).not.toBeNull()
      expect(result.slug).not.toBeNull()
    })
  })
})
