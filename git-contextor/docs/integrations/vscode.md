# Git Contextor - VS Code Integration

Integrating Git Contextor directly into your development workflow within Visual Studio Code can significantly boost productivity. This guide outlines how to set up a simple integration.

## Goal

The goal is to be able to select a block of code or a question in a comment, and use a keybinding to send it as a query to Git Contextor. The results can then be displayed in the output panel or used to populate a new editor tab.

## Recommended Approach: Using the "Tasks" feature

VS Code's built-in `tasks.json` feature is a powerful way to script interactions with external tools like Git Contextor.

### 1. Create a Task

- Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
- Type `Tasks: Configure Task` and select it.
- Choose `Create tasks.json file from template`, then `Others`.
- This will create a `tasks.json` file in your `.vscode` directory.

### 2. Configure the Search Task

Paste the following task configuration into your `tasks.json` file:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Ask Git Contextor",
            "type": "shell",
            "command": "npx git-contextor query \"${selectedText}\"",
            "problemMatcher": [],
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": true,
                "panel": "new",
                "clear": true
            }
        }
    ]
}
```
**Note:** This requires the `git-contextor` CLI to be accessible in your path, for example by running `npm install -g git-contextor`. The `npx` command is a reliable alternative if it's installed locally.

### 3. (Optional) Create a Keybinding

To run this task with a keyboard shortcut:
- Go to `File > Preferences > Keyboard Shortcuts` (or `Code > Preferences > Keyboard Shortcuts` on macOS).
- Click the `keybindings.json` icon in the top right.
- Add the following to your `keybindings.json`:
```json
{
    "key": "ctrl+alt+c", // or your preferred shortcut
    "command": "workbench.action.tasks.runTask",
    "args": "Ask Git Contextor"
}
```

### 4. Usage

Now you can:
1. Select any text in your editor (a function, a comment, a question).
2. Press your configured shortcut (`Ctrl+Alt+C`).
3. A new terminal panel will open and display the semantic search results from Git Contextor.

This provides a quick and seamless way to get context-aware information directly within your editor.
