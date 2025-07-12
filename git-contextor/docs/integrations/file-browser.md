# File Browser Integration

Git Contextor provides a comprehensive file browser API that allows you to explore repository structure and access file contents programmatically. This is useful for building custom interfaces, IDE extensions, or automated tools.

## API Endpoints

### Get File Tree
```
GET /api/files/tree
x-api-key: your-api-key
```

Returns the complete file and directory structure of the repository, respecting `.gitignore` rules.

### Get File Content
```
GET /api/files/content?path=<relative-path>
x-api-key: your-api-key
```

Returns the content of a specific file.

## Response Formats

### File Tree Response

```json
[
  {
    "name": "src",
    "type": "directory",
    "path": "src",
    "children": [
      {
        "name": "index.js",
        "type": "file",
        "path": "src/index.js"
      },
      {
        "name": "api",
        "type": "directory", 
        "path": "src/api",
        "children": [
          {
            "name": "server.js",
            "type": "file",
            "path": "src/api/server.js"
          }
        ]
      }
    ]
  },
  {
    "name": "package.json",
    "type": "file",
    "path": "package.json"
  }
]
```

### File Content Response

```json
{
  "content": "const express = require('express');\nconst app = express();\n..."
}
```

## Implementation Examples

### JavaScript/Node.js File Browser

```javascript
class GitContextorFileBrowser {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    };
  }
  
  async getFileTree() {
    const response = await fetch(`${this.baseUrl}/api/files/tree`, {
      headers: this.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getFileContent(filePath) {
    const encodedPath = encodeURIComponent(filePath);
    const response = await fetch(`${this.baseUrl}/api/files/content?path=${encodedPath}`, {
      headers: this.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.content;
  }
  
  async findFiles(pattern) {
    const tree = await this.getFileTree();
    const matches = [];
    
    const searchTree = (nodes) => {
      for (const node of nodes) {
        if (node.type === 'file' && node.name.includes(pattern)) {
          matches.push(node);
        }
        if (node.children) {
          searchTree(node.children);
        }
      }
    };
    
    searchTree(tree);
    return matches;
  }
  
  async getFilesByExtension(extension) {
    const tree = await this.getFileTree();
    const matches = [];
    
    const searchTree = (nodes) => {
      for (const node of nodes) {
        if (node.type === 'file' && node.name.endsWith(extension)) {
          matches.push(node);
        }
        if (node.children) {
          searchTree(node.children);
        }
      }
    };
    
    searchTree(tree);
    return matches;
  }
}

// Usage examples
const browser = new GitContextorFileBrowser('http://localhost:3333', 'your-api-key');

// Get full file tree
const tree = await browser.getFileTree();
console.log('Repository structure:', JSON.stringify(tree, null, 2));

// Get content of a specific file
const content = await browser.getFileContent('src/index.js');
console.log('File content:', content);

// Find all JavaScript files
const jsFiles = await browser.getFilesByExtension('.js');
console.log('JavaScript files:', jsFiles.map(f => f.path));

// Find files containing 'test'
const testFiles = await browser.findFiles('test');
console.log('Test files:', testFiles.map(f => f.path));
```

### Python File Browser

```python
import requests
from urllib.parse import quote
import json

class GitContextorFileBrowser:
    def __init__(self, base_url, api_key):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        }
    
    def get_file_tree(self):
        """Get the complete file tree of the repository."""
        url = f'{self.base_url}/api/files/tree'
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_file_content(self, file_path):
        """Get the content of a specific file."""
        encoded_path = quote(file_path)
        url = f'{self.base_url}/api/files/content?path={encoded_path}'
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()['content']
    
    def find_files(self, pattern):
        """Find files matching a pattern in their name."""
        tree = self.get_file_tree()
        matches = []
        
        def search_tree(nodes):
            for node in nodes:
                if node['type'] == 'file' and pattern in node['name']:
                    matches.append(node)
                if 'children' in node:
                    search_tree(node['children'])
        
        search_tree(tree)
        return matches
    
    def get_files_by_extension(self, extension):
        """Get all files with a specific extension."""
        tree = self.get_file_tree()
        matches = []
        
        def search_tree(nodes):
            for node in nodes:
                if node['type'] == 'file' and node['name'].endswith(extension):
                    matches.append(node)
                if 'children' in node:
                    search_tree(node['children'])
        
        search_tree(tree)
        return matches
    
    def get_directory_contents(self, directory_path):
        """Get direct contents of a specific directory."""
        tree = self.get_file_tree()
        
        def find_directory(nodes, path_parts):
            if not path_parts:
                return nodes
            
            current_part = path_parts[0]
            remaining_parts = path_parts[1:]
            
            for node in nodes:
                if node['type'] == 'directory' and node['name'] == current_part:
                    if remaining_parts:
                        return find_directory(node['children'], remaining_parts)
                    else:
                        return node['children']
            
            return None
        
        if directory_path == '':
            return tree
        
        path_parts = directory_path.split('/')
        return find_directory(tree, path_parts)

# Usage examples
browser = GitContextorFileBrowser('http://localhost:3333', 'your-api-key')

# Get full file tree
tree = browser.get_file_tree()
print('Repository structure:', json.dumps(tree, indent=2))

# Get content of a specific file
content = browser.get_file_content('src/index.js')
print('File content:', content)

# Find all Python files
py_files = browser.get_files_by_extension('.py')
print('Python files:', [f['path'] for f in py_files])

# Find files containing 'config'
config_files = browser.find_files('config')
print('Config files:', [f['path'] for f in config_files])

# Get contents of src directory
src_contents = browser.get_directory_contents('src')
print('Contents of src/', [f['name'] for f in src_contents])
```

## Advanced Usage Patterns

### File Tree Caching

```javascript
class CachedFileBrowser extends GitContextorFileBrowser {
  constructor(baseUrl, apiKey, cacheTtl = 60000) {
    super(baseUrl, apiKey);
    this.cache = new Map();
    this.cacheTtl = cacheTtl;
  }
  
  async getFileTree() {
    const cacheKey = 'file_tree';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }
    
    const tree = await super.getFileTree();
    this.cache.set(cacheKey, {
      data: tree,
      timestamp: Date.now()
    });
    
    return tree;
  }
  
  async getFileContent(filePath) {
    const cacheKey = `file_content_${filePath}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }
    
    const content = await super.getFileContent(filePath);
    this.cache.set(cacheKey, {
      data: content,
      timestamp: Date.now()
    });
    
    return content;
  }
}
```

### File Statistics

```javascript
class FileStatsBrowser extends GitContextorFileBrowser {
  async getRepositoryStats() {
    const tree = await this.getFileTree();
    const stats = {
      totalFiles: 0,
      totalDirectories: 0,
      filesByExtension: {},
      largestFiles: [],
      totalSize: 0
    };
    
    const processNode = async (node) => {
      if (node.type === 'file') {
        stats.totalFiles++;
        
        const extension = node.name.split('.').pop() || 'no-extension';
        stats.filesByExtension[extension] = (stats.filesByExtension[extension] || 0) + 1;
        
        try {
          const content = await this.getFileContent(node.path);
          const size = content.length;
          stats.totalSize += size;
          
          stats.largestFiles.push({
            path: node.path,
            size: size
          });
        } catch (error) {
          console.warn(`Could not get content for ${node.path}:`, error.message);
        }
      } else if (node.type === 'directory') {
        stats.totalDirectories++;
        
        if (node.children) {
          for (const child of node.children) {
            await processNode(child);
          }
        }
      }
    };
    
    for (const node of tree) {
      await processNode(node);
    }
    
    // Sort largest files by size
    stats.largestFiles.sort((a, b) => b.size - a.size);
    stats.largestFiles = stats.largestFiles.slice(0, 10); // Top 10
    
    return stats;
  }
}

// Usage
const statsBrowser = new FileStatsBrowser('http://localhost:3333', 'your-api-key');
const stats = await statsBrowser.getRepositoryStats();
console.log('Repository statistics:', stats);
```

## Integration with Popular Tools

### VS Code Extension

```typescript
// extension.ts
import * as vscode from 'vscode';

class GitContextorProvider implements vscode.TreeDataProvider<FileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private browser: GitContextorFileBrowser;

  constructor(baseUrl: string, apiKey: string) {
    this.browser = new GitContextorFileBrowser(baseUrl, apiKey);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FileItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FileItem): Promise<FileItem[]> {
    if (!element) {
      // Root level
      const tree = await this.browser.getFileTree();
      return tree.map(node => new FileItem(node, vscode.TreeItemCollapsibleState.Expanded));
    } else {
      // Child nodes
      return element.children || [];
    }
  }
}

class FileItem extends vscode.TreeItem {
  constructor(
    public readonly node: any,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(node.name, collapsibleState);
    
    this.tooltip = node.path;
    this.description = node.type === 'file' ? 'file' : 'directory';
    
    if (node.type === 'file') {
      this.command = {
        command: 'gitcontextor.openFile',
        title: 'Open File',
        arguments: [node.path]
      };
    }
    
    this.children = node.children?.map(child => 
      new FileItem(child, child.type === 'directory' ? 
        vscode.TreeItemCollapsibleState.Collapsed : 
        vscode.TreeItemCollapsibleState.None)
    );
  }
}
```

### CLI Tool

```bash
#!/bin/bash
# git-contextor-browse - Command line file browser

API_KEY=$(cat .gitcontextor/config.json | grep -o '"apiKey": "[^"]*' | cut -d'"' -f4)
BASE_URL="http://localhost:3333"

case "$1" in
  "tree")
    curl -s -H "x-api-key: $API_KEY" "$BASE_URL/api/files/tree" | jq '.'
    ;;
  "cat")
    if [ -z "$2" ]; then
      echo "Usage: $0 cat <file-path>"
      exit 1
    fi
    ENCODED_PATH=$(printf '%s' "$2" | jq -sRr @uri)
    curl -s -H "x-api-key: $API_KEY" "$BASE_URL/api/files/content?path=$ENCODED_PATH" | jq -r '.content'
    ;;
  "find")
    if [ -z "$2" ]; then
      echo "Usage: $0 find <pattern>"
      exit 1
    fi
    curl -s -H "x-api-key: $API_KEY" "$BASE_URL/api/files/tree" | jq -r ".[] | recurse(.children[]?) | select(.type == \"file\" and (.name | contains(\"$2\"))) | .path"
    ;;
  *)
    echo "Usage: $0 {tree|cat|find} [args]"
    echo "  tree          - Show file tree"
    echo "  cat <file>    - Show file content"
    echo "  find <pattern> - Find files matching pattern"
    exit 1
    ;;
esac
```

## Security Considerations

1. **Path Traversal**: The API prevents path traversal attacks by validating file paths
2. **File Access**: Only files within the repository are accessible
3. **API Key Protection**: Always protect your API key and use HTTPS in production
4. **File Size Limits**: Be aware of memory usage when working with large files

## Best Practices

1. **Caching**: Cache file tree and content to reduce API calls
2. **Error Handling**: Implement proper error handling for network issues
3. **Lazy Loading**: Load file contents only when needed
4. **Progress Indication**: Show progress for long-running operations
5. **Filtering**: Implement client-side filtering for better user experience

## Common Use Cases

- **IDE Extensions**: Building custom file browsers for development environments
- **Documentation Tools**: Generating documentation from repository structure
- **Code Analysis**: Analyzing repository structure and file relationships
- **Backup Tools**: Creating backups based on file tree information
- **Migration Tools**: Migrating repositories between different systems

## Next Steps

- Explore [programmatic access](./programmatic.md) for more API capabilities
- Learn about [sharing](../features/sharing-and-chat.md) for collaborative file browsing
- Check out [VS Code integration](./vscode.md) for development workflow integration
