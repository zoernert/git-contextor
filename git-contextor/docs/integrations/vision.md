# Vision API Integration

Git Contextor includes experimental vision capabilities that allow you to index and search through images, diagrams, screenshots, and other visual content in your repository. This is particularly useful for repositories containing documentation with images, UI mockups, architectural diagrams, or code screenshots.

## Configuration

Vision capabilities are disabled by default. To enable them, configure your `.gitcontextor/config.json`:

```json
{
  "vision": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4-vision-preview",
    "apiKey": "your-openai-api-key",
    "prompt": "Describe this image for a software developer. Focus on text, code, diagrams, UI elements, and technical content. Be concise but comprehensive."
  }
}
```

### Supported Providers

- **OpenAI**: `gpt-4-vision-preview` or `gpt-4o`
- **Google**: `gemini-pro-vision`

### Configuration Options

- `enabled`: Enable/disable vision processing
- `provider`: Vision API provider (`openai` or `google`)
- `model`: Specific model to use
- `apiKey`: API key for the provider
- `prompt`: Custom prompt for image description (optional)

## Supported Image Formats

- `.png`
- `.jpg` / `.jpeg`
- `.gif`
- `.bmp`
- `.webp`
- `.svg` (converted to raster format)

## How It Works

1. **Image Discovery**: Git Contextor scans your repository for supported image files
2. **Vision Processing**: Images are sent to the configured vision API for description
3. **Indexing**: The generated descriptions are indexed alongside your code
4. **Search**: You can search for images using natural language queries

## CLI Usage

### Enable Vision Processing

```bash
# Enable vision in your configuration
git-contextor config --vision-enabled true --vision-provider openai --vision-api-key your-key

# Trigger reindexing to process images
git-contextor reindex
```

### Search for Images

```bash
# Search for images containing specific content
git-contextor query "architecture diagram showing database connections"
git-contextor query "screenshot of login form"
git-contextor query "flowchart explaining the authentication process"
```

## API Usage

### Search with Vision Content

```javascript
// Search that may include vision content
const response = await fetch('http://localhost:3333/api/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    query: 'user interface mockup for the dashboard',
    maxTokens: 2048
  })
});

const results = await response.json();
console.log('Search results:', results);
```

### Chat with Vision Context

```javascript
// Chat that can reference images
const response = await fetch('http://localhost:3333/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    query: 'Explain the system architecture shown in the diagrams',
    context_type: 'general'
  })
});

const result = await response.json();
console.log('AI Response:', result.response);
```

## Integration Examples

### Python Integration

```python
import requests
import json

class VisionEnabledGitContextor:
    def __init__(self, base_url, api_key):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        }
    
    def search_images(self, query, max_tokens=2048):
        """Search for images using natural language."""
        url = f'{self.base_url}/api/search'
        payload = {
            'query': query,
            'maxTokens': max_tokens
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()
    
    def ask_about_images(self, question):
        """Ask questions about images in the repository."""
        url = f'{self.base_url}/api/chat'
        payload = {
            'query': question,
            'context_type': 'general'
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()

# Usage
vision_client = VisionEnabledGitContextor('http://localhost:3333', 'your-api-key')

# Search for specific types of images
ui_mockups = vision_client.search_images('user interface mockups and wireframes')
diagrams = vision_client.search_images('system architecture diagrams')
screenshots = vision_client.search_images('application screenshots')

# Ask questions about visual content
response = vision_client.ask_about_images('What does the login flow look like based on the UI mockups?')
print('AI Response:', response['response'])
```

### Node.js Integration

```javascript
class VisionEnabledGitContextor {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    };
  }
  
  async searchImages(query, maxTokens = 2048) {
    const response = await fetch(`${this.baseUrl}/api/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        query: query,
        maxTokens: maxTokens
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async askAboutImages(question) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        query: question,
        context_type: 'general'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async findImagesInContext(searchResults) {
    // Filter search results to find image-related content
    const imageResults = searchResults.results.filter(result => {
      const filePath = result.filePath.toLowerCase();
      return filePath.includes('.png') || 
             filePath.includes('.jpg') || 
             filePath.includes('.jpeg') ||
             filePath.includes('.gif') ||
             filePath.includes('.svg') ||
             result.content.toLowerCase().includes('image') ||
             result.content.toLowerCase().includes('diagram');
    });
    
    return imageResults;
  }
}

// Usage
const visionClient = new VisionEnabledGitContextor('http://localhost:3333', 'your-api-key');

// Search for images
const results = await visionClient.searchImages('dashboard screenshot showing user statistics');
console.log('Found images:', results.results.length);

// Ask about visual content
const response = await visionClient.askAboutImages('Describe the user interface design patterns used in this application');
console.log('AI Analysis:', response.response);
```

## Common Use Cases

### Documentation Analysis

```javascript
// Find all documentation images
const docImages = await visionClient.searchImages('documentation images diagrams screenshots');

// Analyze documentation completeness
const analysis = await visionClient.askAboutImages(
  'Based on the documentation images, what areas of the application are well-documented and what might need more visual documentation?'
);
```

### UI/UX Analysis

```javascript
// Find UI mockups and designs
const uiDesigns = await visionClient.searchImages('UI mockups wireframes user interface designs');

// Get design insights
const designAnalysis = await visionClient.askAboutImages(
  'What are the main design patterns and UI components shown in the mockups?'
);
```

### Architecture Documentation

```javascript
// Find architectural diagrams
const architectureDiagrams = await visionClient.searchImages('system architecture diagrams database schema API flow');

// Get architectural insights
const archAnalysis = await visionClient.askAboutImages(
  'Explain the system architecture based on the diagrams in the repository'
);
```

## Performance Considerations

1. **API Costs**: Vision API calls are more expensive than text processing
2. **Processing Time**: Image processing takes longer than text indexing
3. **File Size**: Large images may hit API limits
4. **Rate Limits**: Vision APIs often have stricter rate limits

## Optimization Tips

### Image Preprocessing

```javascript
// Resize large images before processing
const sharp = require('sharp');

async function preprocessImage(imagePath) {
  const buffer = await sharp(imagePath)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  return buffer;
}
```

### Selective Processing

```json
{
  "vision": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4-vision-preview",
    "apiKey": "your-key",
    "includePatterns": [
      "docs/**/*.png",
      "assets/**/*.jpg",
      "screenshots/**/*"
    ],
    "excludePatterns": [
      "node_modules/**",
      "build/**",
      "dist/**"
    ]
  }
}
```

## Error Handling

```javascript
async function safeVisionSearch(query) {
  try {
    const results = await visionClient.searchImages(query);
    return results;
  } catch (error) {
    if (error.message.includes('rate limit')) {
      console.log('Rate limit exceeded, retrying in 60 seconds...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return await safeVisionSearch(query);
    } else if (error.message.includes('vision not enabled')) {
      console.log('Vision processing is not enabled for this repository');
      return null;
    } else {
      throw error;
    }
  }
}
```

## Best Practices

1. **Selective Enablement**: Only enable vision for repositories with meaningful visual content
2. **Cost Management**: Monitor API usage to control costs
3. **Image Quality**: Use clear, high-quality images for better results
4. **Descriptive Filenames**: Use descriptive filenames to complement vision descriptions
5. **Regular Updates**: Re-index when adding new images

## Limitations

1. **Text in Images**: OCR capability depends on the vision model used
2. **Context Understanding**: Vision models may not fully understand domain-specific diagrams
3. **File Size Limits**: Most vision APIs have file size restrictions
4. **Processing Time**: Vision processing is significantly slower than text processing

## Troubleshooting

### Common Issues

1. **Vision Not Working**: Check if vision is enabled in configuration
2. **API Errors**: Verify API key and model availability
3. **No Results**: Images might not be indexed yet, try reindexing
4. **Rate Limits**: Implement retry logic with exponential backoff

### Debug Commands

```bash
# Check vision configuration
git-contextor config --show | grep -A 10 vision

# Force reindex with debug info
DEBUG=true git-contextor reindex
```

## Future Enhancements

- Support for additional image formats
- Local vision processing options
- Better OCR integration
- Batch processing optimizations
- Custom vision prompts per file type

## Next Steps

- Learn about [programmatic access](./programmatic.md) for more API capabilities
- Explore [sharing features](../features/sharing-and-chat.md) for collaborative visual analysis
- Check out [LangChain integration](./langchain.md) for advanced RAG with vision content
