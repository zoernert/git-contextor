const { queryLLM, createChatCompletion } = require('../../src/utils/llm');

// Mock fetch globally
global.fetch = jest.fn();

describe('LLM Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queryLLM', () => {
    it('should handle invalid config', async () => {
      const config = { provider: 'invalid' };
      
      await expect(queryLLM('test prompt', config)).rejects.toThrow('Unsupported provider: invalid');
    });

    it('should handle OpenAI provider', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [
            {
              message: {
                content: 'Test response',
              },
            },
          ],
        }),
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await queryLLM('test prompt', config);
      
      expect(result).toBe('Test response');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('test prompt'),
        })
      );
    });

    it('should handle API errors', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
      };

      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      };

      fetch.mockResolvedValue(mockResponse);

      await expect(queryLLM('test prompt', config)).rejects.toThrow('LLM API error: 401 Unauthorized');
    });

    it('should handle network errors', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
      };

      fetch.mockRejectedValue(new Error('Network error'));

      await expect(queryLLM('test prompt', config)).rejects.toThrow('Network error');
    });

    it('should handle missing response content', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [],
        }),
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await queryLLM('test prompt', config);
      
      expect(result).toBe('');
    });
  });

  describe('createChatCompletion', () => {
    it('should create chat completion with messages', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
      };

      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [
            {
              message: {
                content: 'I am doing well, thank you!',
              },
            },
          ],
        }),
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await createChatCompletion(messages, config);
      
      expect(result).toBe('I am doing well, thank you!');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('How are you?'),
        })
      );
    });

    it('should handle empty messages array', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
      };

      await expect(createChatCompletion([], config)).rejects.toThrow('Messages array cannot be empty');
    });

    it('should handle invalid message format', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
      };

      const messages = [
        { role: 'user' }, // Missing content
      ];

      await expect(createChatCompletion(messages, config)).rejects.toThrow('Invalid message format');
    });

    it('should handle unsupported provider', async () => {
      const config = {
        provider: 'unsupported',
        apiKey: 'test-key',
        model: 'test-model',
      };

      const messages = [
        { role: 'user', content: 'Hello' },
      ];

      await expect(createChatCompletion(messages, config)).rejects.toThrow('Unsupported provider: unsupported');
    });
  });
});
