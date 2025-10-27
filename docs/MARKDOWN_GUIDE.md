# 📝 Markdown Documentation Guide

Guide for writing documentation for the Tower Dynamics project.

## Table of Contents

1. [Documentation Structure](#documentation-structure)
2. [Markdown Syntax](#markdown-syntax)
3. [Documentation Standards](#documentation-standards)
4. [File Naming](#file-naming)
5. [Examples](#examples)
6. [Best Practices](#best-practices)

---

## Documentation Structure

### Recommended File Organization

```
docs/
├── README.md                 # Documentation index
├── quick-start.md            # Quick setup guide
├── user-guide.md             # End-user documentation
├── developer-setup.md        # Developer environment
├── api-reference.md          # API documentation
├── architecture.md           # System architecture
├── contributing.md           # Contribution guide
├── troubleshooting.md        # Common issues
├── faq.md                    # Frequently asked questions
└── guides/                   # Detailed guides
    ├── multi-tenant.md
    ├── mqtt-integration.md
    ├── security.md
    └── deployment.md
```

---

## Markdown Syntax

### Headers

```markdown
# H1 - Main Title
## H2 - Section
### H3 - Subsection
#### H4 - Detail
##### H5 - Minor detail
```

### Emphasis

```markdown
**Bold text** for important terms
*Italic text* for emphasis
`inline code` for code snippets
~~strikethrough~~ for deprecated features
```

### Lists

```markdown
- Unordered list item
  - Nested item
- Another item

1. Ordered list
2. Second item
   a. Nested numbered

- [ ] Unchecked task
- [x] Checked task
```

### Code Blocks

```markdown
\```bash
# Shell command
npm run dev
\```

\```javascript
// JavaScript code
const express = require('express');
\```

\```json
{
  "key": "value"
}
\```
```

### Links

```markdown
[Link Text](path/to/file.md)
[External Link](https://example.com)
[Anchor Link](#section-name)
```

### Images

```markdown
![Alt Text](path/to/image.png)
![Logo](https://example.com/logo.png)
```

### Blockquotes

```markdown
> Important note
> Continue on next line
```

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

| Left | Center | Right |
|:-----|:------:|------:|
| Left | Center | Right |
```

### Horizontal Rules

```markdown
---

***
___
```

---

## Documentation Standards

### File Header Template

Every documentation file should start with:

```markdown
# Title

Brief description of the document.

## Table of Contents

1. [Section 1](#section-1)
2. [Section 2](#section-2)
3. [Section 3](#section-3)

---

## Section 1
```

### Content Structure

Each document should follow this structure:

1. **Title & Description** - What is this?
2. **Table of Contents** - What's included?
3. **Prerequisites** - What do I need?
4. **Step-by-Step Guide** - How do I do it?
5. **Examples** - Real examples
6. **Troubleshooting** - Common issues
7. **Related Docs** - Links to related docs

---

## File Naming

### Conventions

```markdown
✅ Good:
- quick-start.md
- api-reference.md
- user-guide.md
- mqtt-integration.md

❌ Bad:
- QuickStart.md          # Title case
- API Reference.md       # Spaces
- user_guide.md          # Underscores
- guide.pdf              # Wrong format
```

### File Types

- **kebab-case** for multi-word files
- **Lowercase** for single words
- **Descriptive** names
- **Short** and clear

---

## Examples

### User Guide

```markdown
# User Guide for Operators

This guide explains how operators use the system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Monitoring Cranes](#monitoring-cranes)
3. [Managing Tickets](#managing-tickets)

---

## Getting Started

### Login

1. Navigate to the login page
2. Enter your credentials:
   - Email: your@email.com
   - Password: your-password
3. Click "Login"

### Dashboard

After login, you'll see:

- **My Cranes** - List of assigned cranes
- **Alerts** - Important notifications
- **Tickets** - Active issues

---

## Monitoring Cranes

### Viewing Crane Status

Click on any crane card to view details:

**Status Indicators:**
- 🟢 Online - Healthy
- 🟡 Warning - Minor issues
- 🔴 Alert - Critical issues

### Understanding Data

| Metric | Description |
|--------|-------------|
| Load | Current crane load |
| SWL | Safe Working Load |
| Util | Utilization percentage |

---

## Managing Tickets

### Creating a Ticket

1. Click "Create Ticket"
2. Fill in details:
   - Issue type
   - Description
   - Priority
3. Click "Submit"

### Ticket Status

- **Open** - New ticket
- **In Progress** - Being worked on
- **Resolved** - Fixed
- **Closed** - Confirmed

---

## Need Help?

- [FAQ](./faq.md)
- [Troubleshooting](./troubleshooting.md)
- [Contact Support](./support.md)
```

### API Documentation

```markdown
# API Reference

Complete API documentation.

## Base URL

```
Development: http://localhost:3001
Production: https://api.example.com
```

## Authentication

All API endpoints require JWT authentication via httpOnly cookie.

---

## Endpoints

### Get All Cranes

```http
GET /api/cranes
```

**Description:** Returns list of all accessible cranes.

**Authentication:** Required

**Parameters:**
- `status` (optional) - Filter by status
- `page` (optional) - Page number
- `limit` (optional) - Items per page

**Response:**
```json
{
  "cranes": [
    {
      "id": "crane_id",
      "craneId": "TC-001",
      "name": "Crane A",
      "status": "online"
    }
  ]
}
```

**Example:**
```bash
curl -X GET http://localhost:3001/api/cranes
```
```

---

## Best Practices

### 1. Writing Style

✅ **DO:**
- Write clearly and concisely
- Use simple language
- Include examples
- Add screenshots when helpful
- Keep paragraphs short
- Use bullet points
- Check spelling and grammar

❌ **DON'T:**
- Use jargon without explanation
- Write overly long paragraphs
- Skip examples
- Assume prior knowledge
- Use vague descriptions
- Forget to update when code changes

### 2. Code Examples

✅ **Good:**
```markdown
### Install Dependencies

```bash
npm install
```

### Start Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`
```

❌ **Bad:**
```markdown
Install dependencies and start server. Use npm.
```

### 3. Commands

✅ **Show Output:**
```markdown
```bash
$ npm run dev
> Server started on port 3001
```
```

✅ **Show Errors:**
```markdown
```bash
$ npm start
Error: Module not found
```

Solution: Run `npm install` first.
```

### 4. Cross-References

✅ **Link to related docs:**
```markdown
For more details, see [API Reference](./api-reference.md)
```

✅ **Link to sections:**
```markdown
See [Authentication](#authentication) section above.
```

### 5. Warnings and Notes

```markdown
> ⚠️ **Warning:** This operation is destructive!
```

```markdown
> 💡 **Tip:** Use environment variables for secrets
```

```markdown
> 📝 **Note:** This feature requires admin access
```

### 6. Emojis (Use Sparingly)

```markdown
- ✅ Done / Ready
- ⚠️ Warning / Important
- 💡 Tip / Hint
- 📝 Note
- 🚀 Quick / Fast
- 🔒 Security
- 🐛 Bug
- ⚡ Performance
```

---

## Template for New Docs

```markdown
# Title of the Document

Brief description of what this document covers.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Detailed Instructions](#detailed-instructions)
4. [Examples](#examples)
5. [Troubleshooting](#troubleshooting)

---

## Introduction

Explain what this document is about and why it's useful.

## Getting Started

Quick start guide or prerequisites.

### Prerequisites

- Item 1
- Item 2
- Item 3

## Detailed Instructions

Step-by-step instructions with explanations.

### Step 1: Do Something

Detailed instructions...

### Step 2: Do Something Else

More instructions...

## Examples

### Example 1

```javascript
// Code example
```

### Example 2

```bash
# Command example
```

## Troubleshooting

### Issue 1

**Problem:** Description of problem

**Solution:** How to fix it

## Related Documentation

- [Link to Related Doc](./other-doc.md)
- [Another Link](./another-doc.md)
```

---

## Documentation Checklist

Before publishing documentation, ensure:

- [ ] Clear title and description
- [ ] Table of contents
- [ ] Complete instructions
- [ ] Code examples
- [ ] Troubleshooting section
- [ ] Links to related docs
- [ ] Spelling and grammar checked
- [ ] Code tested and works
- [ ] Screenshots (if applicable)
- [ ] Cross-references added

---

## Additional Resources

- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [Markdown Cheatsheet](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)

---

**Happy Writing! 📝**

