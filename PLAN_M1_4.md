# Git Contextor Standalone Executable Implementation Plan

## Overview
Transform the existing Git Contextor Node.js application into standalone executables for Windows and Linux that bundle the Node.js runtime and provide a GUI-first experience with enhanced configuration management.

## Requirements
- ✅ Bundle Node.js runtime with executable (no external Node.js required)
- ✅ Support Windows (.exe) and Linux binaries
- ✅ Folder selection dialog on startup
- ✅ Complete UI-based configuration (no JSON editing required)
- ✅ No side effects to existing codebase
- ✅ Maintain all current functionality

## Implementation Strategy

### 1. Packaging Technology
**Use PKG (Vercel's Binary Compiler)**
- Bundles Node.js runtime + application into single executable
- Cross-platform support (Windows/Linux/macOS)
- Handles npm dependencies automatically
- Mature and well-maintained

### 2. File Structure Changes

#### New Files to Create:
```
git-contextor/
├── bin/
│   └── git-contextor-standalone.js          # New standalone entry point
├── src/
│   ├── ui/
│   │   └── public/
│   │       ├── js/
│   │       │   └── config-enhanced.js       # Enhanced config UI
│   │       └── config-enhanced.html         # New config page
│   └── utils/
│       └── standalone.js                    # Standalone utilities
├── scripts/
│   ├── create-installer-win.js              # Windows installer script
│   ├── create-installer-linux.js            # Linux installer script
│   └── optimize-assets.js                   # Asset optimization
└── dist/
    └── standalone/                          # Build output directory
```

#### Files to Modify:
```
├── package.json                             # Add PKG config & build scripts
├── src/cli/commands/start.js                # Add standalone mode support
└── src/core/ConfigManager.js                # Add GUI config validation
```

### 3. Core Implementation Tasks

#### Task 1: Create Standalone Entry Point
**File:** `bin/git-contextor-standalone.js`

**Requirements:**
- Detect if running as PKG executable
- Show folder selection dialog if no folder specified
- Support three selection methods:
  1. Browse for folder (with fallback)
  2. Manual path entry with validation
  3. Use current directory
- Auto-initialize Git Contextor if not configured
- Auto-start web interface with browser opening
- Handle PKG-specific resource paths

**Key Functions:**
```javascript
async function selectWorkingDirectory()
async function promptForPath() 
async function standaloneMode()
```

#### Task 2: Enhanced Configuration UI System
**File:** `src/ui/public/js/config-enhanced.js`

**Requirements:**
- Replace JSON text editing with structured forms
- Support all configuration sections:
  - Repository settings (with folder browser)
  - Embedding configuration (provider-specific fields)
  - Chat/LLM settings
  - Vector store configuration
  - Indexing and chunking options
  - Service and monitoring settings
  - Performance tuning
  - Standalone-specific options
- Real-time validation and field dependencies
- Import/export functionality
- Auto-save with change tracking
- Responsive design for different screen sizes

**Key Classes:**
```javascript
class ConfigurationManager {
  async loadConfig()
  renderConfigurationForms()
  setupEventListeners()
  async saveConfig()
  validateConfiguration()
}
```

#### Task 3: Build System and PKG Configuration
**File:** `package.json` modifications

**Requirements:**
- Add PKG dependency and configuration
- Define build scripts for multiple platforms
- Specify assets to bundle (UI files, docs, models)
- Configure target platforms (node18-win-x64, node18-linux-x64)
- Set up installer creation scripts

**New Scripts:**
```json
{
  "build:standalone:win": "pkg bin/git-contextor-standalone.js --targets node18-win-x64 --out-path dist/standalone --output git-contextor-win.exe",
  "build:standalone:linux": "pkg bin/git-contextor-standalone.js --targets node18-linux-x64 --out-path dist/standalone --output git-contextor-linux",
  "package:win": "npm run build:standalone:win && npm run create:installer:win",
  "package:linux": "npm run build:standalone:linux && npm run create:installer:linux"
}
```

#### Task 4: Installer Creation Scripts
**Files:** `scripts/create-installer-win.js` and `scripts/create-installer-linux.js`

**Requirements:**
- Windows: Create NSIS-based installer with:
  - Start menu shortcuts
  - Desktop shortcut option
  - File association for .gctx files
  - Uninstaller
  - Auto-update capability
- Linux: Create AppImage or .deb package with:
  - Desktop entry file
  - Icon integration
  - MIME type associations
  - Auto-update support

#### Task 5: Standalone Mode Integration
**File:** `src/cli/commands/start.js` modifications

**Requirements:**
- Detect standalone mode via environment variable
- Auto-open browser when `autoOpen: true`
- Support `standalone: true` option
- Handle bundled resource paths correctly
- Integrate with system tray (future enhancement)

#### Task 6: Asset Optimization and Bundling
**File:** `scripts/optimize-assets.js`

**Requirements:**
- Minimize CSS and JavaScript files
- Optimize images and icons
- Bundle commonly used assets
- Create resource manifest for PKG
- Handle Transformers.js model files
- Compress documentation files

### 4. Configuration Enhancements

#### Enhanced Config Structure
```javascript
{
  // Existing sections remain unchanged
  "repository": { "name": "", "path": "", "branch": "main" },
  "embedding": { "provider": "local", "model": "", "apiKey": "", "dimensions": 384 },
  "chat": { "provider": "openai", "model": "", "apiKey": "" },
  
  // New standalone section
  "standalone": {
    "autoStart": true,
    "autoOpenBrowser": true,
    "minimizeToTray": false,
    "lastSelectedPath": "",
    "windowState": { "width": 1200, "height": 800, "maximized": false }
  }
}
```

#### UI Configuration Sections
1. **Repository Settings** - Name, path (with browser), branch
2. **Embedding Configuration** - Provider, model, API key, dimensions
3. **Chat/LLM Settings** - Provider, model, API key
4. **Vector Store** - Provider selection, Qdrant settings
5. **Indexing Options** - File extensions, exclude patterns, chunking
6. **Service Configuration** - Port, collection persistence
7. **Monitoring** - File watching, debounce, queue size
8. **Performance** - Batch size, concurrency, caching
9. **Standalone Options** - Auto-start, browser opening, tray behavior

### 5. Build Process

#### Development Build
```bash
npm install
npm run build:standalone:win    # Creates git-contextor-win.exe
npm run build:standalone:linux  # Creates git-contextor-linux
```

#### Production Packaging
```bash
npm run package:win    # Creates installer for Windows
npm run package:linux  # Creates package for Linux
```

#### Asset Requirements
- Bundle all UI assets (`src/ui/public/**/*`)
- Include documentation (`docs/**/*`)
- Package Transformers.js models for offline use
- Include Tree-sitter language parsers
- Bundle Docker configurations

### 6. User Experience Flow

#### First Launch
1. Application starts with folder selection dialog
2. User selects project folder via:
   - File browser dialog (preferred)
   - Manual path entry (fallback)
   - Current directory (quick option)
3. Auto-initialization if `.gitcontextor` doesn't exist
4. Configuration wizard for first-time setup
5. Automatic service start with browser opening

#### Subsequent Launches
1. Application remembers last selected folder
2. Quick start with optional folder change
3. Auto-start service if configured
4. System tray integration (future)

#### Configuration Management
1. Access via web UI settings page
2. Structured forms instead of JSON editing
3. Real-time validation and help text
4. Import/export for backup and sharing
5. Reset to defaults option

### 7. Testing Strategy

#### Manual Testing
- Test on clean Windows 10/11 systems
- Test on Ubuntu/Debian Linux distributions
- Verify all configuration options work
- Test folder selection on different systems
- Validate auto-initialization process

#### Automated Testing
- Unit tests for standalone utilities
- Integration tests for config management
- Build verification tests
- Installer testing scripts

### 8. Deployment and Distribution

#### GitHub Releases
- Automated builds via GitHub Actions
- Release assets: Windows .exe, Linux binary, installers
- Version matching with npm package
- Changelog and upgrade instructions

#### Download Flow
1. User downloads appropriate binary for their OS
2. Windows: Run installer or portable .exe
3. Linux: Install package or run AppImage
4. First launch triggers setup wizard

### 9. Backward Compatibility

#### Existing Users
- CLI interface remains unchanged
- All existing configuration files work
- API endpoints maintain compatibility
- Docker usage unaffected

#### Migration Path
- Automatic detection of existing installations
- Config migration wizard
- Side-by-side installation support
- Export/import between CLI and standalone versions

### 10. Future Enhancements

#### Phase 2 Features
- macOS support and code signing
- Auto-update mechanism
- System tray integration
- File association handlers
- Portable mode option

#### Phase 3 Features
- Electron-based GUI for advanced features
- Plugin system for custom integrations
- Cloud synchronization options
- Team collaboration features

## Implementation Checklist

### Core Development
- [ ] Create `bin/git-contextor-standalone.js` with folder selection
- [ ] Implement `ConfigurationManager` class for enhanced UI
- [ ] Create `config-enhanced.html` page with structured forms
- [ ] Add PKG configuration to `package.json`
- [ ] Modify `start.js` command for standalone mode support
- [ ] Create asset optimization script

### Build System
- [ ] Set up PKG build scripts for Windows and Linux
- [ ] Create Windows installer script using NSIS
- [ ] Create Linux package creation script
- [ ] Test build process on both platforms
- [ ] Verify all assets are properly bundled

### Testing and Validation
- [ ] Test standalone executable on clean systems
- [ ] Validate configuration UI functionality
- [ ] Test folder selection on different OS versions
- [ ] Verify backward compatibility with existing installations
- [ ] Performance testing with bundled runtime

### Documentation and Distribution
- [ ] Update README with standalone installation instructions
- [ ] Create user guide for standalone version
- [ ] Set up GitHub Actions for automated builds
- [ ] Create release process documentation
- [ ] Test download and installation flow

## Success Criteria
1. ✅ Single executable files for Windows and Linux
2. ✅ No external Node.js dependency required
3. ✅ Intuitive folder selection on startup
4. ✅ Complete GUI-based configuration management
5. ✅ All existing features work in standalone mode
6. ✅ No breaking changes to current codebase
7. ✅ Professional installer experience
8. ✅ Easy distribution and deployment

## Estimated Timeline
- **Phase 1 (Core Development):** 2-3 weeks
- **Phase 2 (Build System):** 1 week  
- **Phase 3 (Testing & Polish):** 1 week
- **Phase 4 (Documentation & Release):** 1 week

**Total Estimated Time:** 5-6 weeks

This plan provides a comprehensive roadmap for implementing standalone executables while maintaining the existing codebase integrity and adding significant user experience improvements.