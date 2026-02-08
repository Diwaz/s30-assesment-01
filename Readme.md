**Tech Stack:** Node.js, Express, MongoDB, Mongoose, Zod, JWT, bcrypt, ws (WebSocket)


---

## Overview
 Backend system for a **real-time customer support platform** with:

- Authentication & authorization
- Role-based access control (RBAC)
- Ticket / conversation lifecycle
- Supervisor → Agent assignment
- Admin-level analytics
- WebSocket-based real-time messaging

## **HTTP and WS will run on same port as 3000**

---

## Roles

| Role | Description |
| --- | --- |
| **Admin** | System-level analytics & visibility |
| **Supervisor** | Manages agents & assigns conversations |
| **Agent** | Handles conversations assigned by supervisor |
| **Candidate** | End user requesting support |

---

## JWT Authentication

### JWT Payload

```jsx
{
  "userId": "MONGODB_OBJECT_ID",
  "role": "admin" | "supervisor" | "agent" | "candidate"
}
```

HTTP Header

```jsx
Authorization: Bearer <JWT_TOKEN>
```

WebSocket Connection

```jsx
ws://localhost:3000/ws?token=<JWT_TOKEN>
```

---

## Response Format Standard (MANDATORY)

### Success

```jsx
{
  "success": true,
  "data": {}
}
```

### Error

```jsx
{
  "success": false,
  "error": "Error message"
}
```

**ALL HTTP responses must follow this format**

---

## MongoDB Models

### User

```jsx
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String,
  role: "admin" | "supervisor" | "agent" | "candidate",
  supervisorId: ObjectId | null  // required only for agents
}
```

---

### Conversation

```jsx
{
  _id: ObjectId,
  candidateId: ObjectId,
  agentId: ObjectId | null,
  supervisorId: ObjectId,
  status: "open" | "assigned" | "closed",
  createdAt: Date
}
```

---

### Message

```jsx
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: ObjectId,
  senderRole: String,
  content: String,
  createdAt: Date
}
```

---

## Validation & Errors

### Validation Error (400)

```jsx
{
  "success": false,
  "error": "Error message"
}

**Examples:**
- "Invalid request schema"
- "Invalid supervisor role"
- "Candidate already has an active conversation"
- "Conversation already closed"
```

### Unauthorised (401)

```jsx
{
  "success": false,
  "error": "Unauthorized, token missing or invalid"
}
```

### Forbidden (403)

```jsx
{
  "success": false,
  "error": "Forbidden, insufficient permissions"
}
```

### Conflict (409)

if there’s resource conflict or duplicate entries

```jsx
{
  "success": false,
  "error": "Descriptive conflict message"
}

**Examples:**
- "Email already exists"
- "Candidate already has an active conversation"
```

### Not Found (404)

If resource not exist in DB

```jsx
{
  "success": false,
  "error": "Resource not found"
}

**Examples:**
- "User not found"
- "Conversation not found"
- "Supervisor not found"
- "Agent not found"
```

---

# HTTP API ROUTES

---

## 1. POST `/auth/signup`

### Request Body

```jsx
{
  "name": "Rahul",
  "email": "rahul@test.com",
  "password": "secret123",
  "role": "agent",
  "supervisorId": "s100"
}
```

> supervisorId required only if role = agent
> 

### Success (201)

```jsx
{
  "success": true,
  "data": {
    "_id": "u101",
    "name": "Rahul",
    "email": "rahul@test.com",
    "role": "agent"
  }
}
```

---

## 2. POST `/auth/login`

### Request Body

```jsx
{
  "email": "rahul@test.com",
  "password": "secret123"
}
```

### Success (200)

```jsx
{
  "success": true,
  "data": {
    "token": "JWT_TOKEN"
  }
}
```

---

## 3. GET `/auth/me`

### Success (200)

```jsx
{
  "success": true,
  "data": {
    "_id": "u101",
    "name": "Rahul",
    "email": "rahul@test.com",
    "role": "agent"
  }
}
```

---

## 4. POST `/conversations`

**Role:** Candidate only

### Request Body

```jsx
{
  "supervisorId": "s100"
}
```

### Success (201)

```jsx
{
  "success": true,
  "data": {
    "_id": "c200",
    "status": "open",
    "supervisorId": "s100"
  }
}
```

### Business Rules

- A candidate can only have ONE active (open/assigned) conversation at a time
- Creating a new conversation when one already exists should return 409 error

---

## 5. POST `/conversations/:id/assign`

**Role:** Supervisor only

### Request Body

```jsx
{
  "agentId": "a101"
}
```

### Success (200)

```jsx
{
  "success": true,
  "data": {
    "conversationId": "c200",
    "agentId": "a101",
    "supervisorId": "s100"
  }
}
```

### Business Rules

- Supervisor can only assign agents where agent.supervisorId matches supervisor._id else reuturn 403 with “Agent doesn’t belong to you”
- Supervisor can reassign conversations even if already assigned else return 403 with “cannot assign agent”
- Previous agent loses access to conversation
- Conversation status remains "open" after assignment, it’ll change later in ws JOIN EVENT1

---

## 6. GET `/conversations/:id`

**Access Rules:**

- Admin → any conversation
- Others → only that belongs to them

### Success (200)

```jsx
{
  "success": true,
  "data": {
    "_id": "c200",
    "status": "closed",
    "agentId": "a101",
    "supervisorId": "s100",
    "candidateId": "cand1",
    "messages": [
      {
        "senderId": "cand1",
        "senderRole": "candidate",
        "content": "Hi, I need help",
        "createdAt": "2025-03-11T10:30:00.000Z"
      }
    ]
  }
}
```

- If conversation status is "assigned": return in-memory messages
- If conversation status is "closed": return persisted messages from MongoDB
- Return empty array if no messages exist

---

## 7. POST `/conversations/:id/close`

**Role:** Admin and supervisor only

### Request Body

```jsx
{}
```

### Success (200)

```jsx
{
  "success": true,
  "data": {
    "conversationId": "c200",
    "status": "closed"
  }
}
```

### Business Rules

- Admin can close all the conversation
- Conversation status must be "open" before closing return 400 if status mismatch
- This is the case If agent didn’t join the chat

---

## 8. GET `/admin/analytics`

**Role:** Admin only

### Success (200)

```jsx
{
  "success": true,
  "data": [
    {
      "supervisorId": "s100",
      "supervisorName": "John Doe",
      "agents": 3,
      "conversationsHandled": 24
    }
  ]
}
```

### Business Rules

- Returns analytics grouped by supervisor
- `agents` = count of agents under each supervisor
- `conversationsHandled` = count of closed conversations for all agents under that supervisor

---

# WebSocket Server

---

## Connection Setup (Server Side)

When a client connects:

1. **Extract `token`** from query parameter
2. **Verify JWT**
    - If invalid → send `ERROR` event and close connection
3. **Attach user info to socket**

javascript

```jsx
    ws.user = {
      userId: decoded.userId,
      role: decoded.role
    };
```

1. Initialize socket metadata:

```jsx
    ws.rooms = new Set(); // rooms this socket has joined
```

Room Model

- **One conversation = one WebSocket room**
- Room name format:

```jsx
conversation:<conversationId>
```

Example

```jsx
conversation:c200
```

---

## In-Memory State

### Rooms Map

```jsx
const rooms = {
  "conversation:c200": Set<ws>,
  "conversation:c201": Set<ws>
};
```

---

### Conversation Messages (In-Memory)

```jsx
const conversationMessages = {
  "c200": [
    {
      senderId: "u101",
      senderRole: "agent",
      content: "Hello",
      createdAt: "2025-03-11T10:30:00.000Z"
    }
  ]
};
```

### Rules

- Messages are stored **only in memory** during active conversation
- Messages are **saved to MongoDB** only when conversation is closed
- In-memory state is **cleared when conversation is closed**

---

## WebSocket Message Format (GLOBAL)

**All messages (client → server and server → client) MUST use:**

```jsx
{
  "event": "EVENT_NAME",
  "data": {}
}
```

---

# WebSocket Events

---

## Event 1: JOIN_CONVERSATION

**Purpose:** Join a WebSocket room for a conversation

**Allowed Roles:** Candidate, Agent

others are forbidden

---

### Client Sends

```jsx
{
  "event": "JOIN_CONVERSATION",
  "data": {
    "conversationId": "c200"
  }
}
```

---

### Server Actions

### For Candidate:

1. Verify the candidate owns the conversation else error with not allowed message
2. Create room if not exists
3. Add socket to room
4. Initialize in-memory message array if not exists

### For Agent:

1. Verify the agent is assigned to the conversation else error with not allowed message
2. Update conversation status to "assigned" in database
3. Create room if not exists
4. Add socket to room
5. Initialize in-memory message array if not exists

---

### Success Response (Unicast)

json

```jsx
{
  "event": "JOINED_CONVERSATION",
  "data": {
    "conversationId": "c200",
    "status": "assigned"
  }
}
```

---

## Event 2: SEND_MESSAGE

**Purpose:** Send a chat message inside a conversation

**Allowed Roles:** Candidate, Agent

others are forbidden

---

### Client Sends

```jsx
{
  "event": "SEND_MESSAGE",
  "data": {
    "conversationId": "c200",
    "content": "Hello, I need help"
  }
}
```

---

### Server Actions

1. Verify socket has joined the room
2. Create message object:

```jsx
    const message = {
      senderId: ws.user.userId,
      senderRole: ws.user.role,
      content: content,
      createdAt: new Date().toISOString()
    };
```

1. Append message to **in-memory array**
2. Broadcast message to **all sockets in the room except himself**

---

### Broadcast Message

```jsx
{
  "event": "NEW_MESSAGE",
  "data": {
    "conversationId": "c200",
    "senderId": "u101",
    "senderRole": "agent",
    "content": "Hello, I need help",
    "createdAt": "2025-03-11T10:30:00.000Z"
  }
}
```

---

## Event 3: LEAVE_CONVERSATION

**Purpose:** Leave a conversation room

**Allowed Roles:** Candidate, Agent

others are forbidden

---

### Client Sends

```jsx
{
  "event": "LEAVE_CONVERSATION",
  "data": {
    "conversationId": "c200"
  }
}
```

---

### Server Actions

1. Remove socket from room
2. Remove room from `ws.rooms`
3. Delete room if empty

---

### Success Response (Unicast)

```jsx
{
  "event": "LEFT_CONVERSATION",
  "data": {
    "conversationId": "c200"
  }
}
```

---

## Event 4: CLOSE_CONVERSATION

**Purpose:** Close a conversation and save messages to database

**Allowed Roles:** Agent only

others are forbidden

---

### Client Sends

```jsx
{
  "event": "CLOSE_CONVERSATION",
  "data": {
    "conversationId": "c200"
  }
}
```

---

### Server Actions

1. Verify agent is assigned to conversation else return error with not allowed message
2. Verify conversation status is **"assigned"**
    - If status is "open" → return ERROR "Conversation not yet assigned"
    - If status is "closed" → return ERROR "Conversation already closed"
3. Save all in-memory messages to MongoDB (bulk insert)
4. Update conversation status to "closed" in database
5. Broadcast closure to all sockets in room (excluding sender)
6. Remove all sockets from room
7. Delete room from memory
8. Delete in-memory messages for this conversation

---

### Broadcast Message (Excluding Sender)

json

```jsx
{
  "event": "CONVERSATION_CLOSED",
  "data": {
    "conversationId": "c200"
  }
}
```

---

# WebSocket Error Handling

## WebSocket Disconnect Behavior

- When a socket disconnects:
1. Remove socket from all joined rooms
2. Delete room if empty
3. In-memory messages are NOT deleted (persist until conversation closes)
4. Agents/Candidates can rejoin anytime using JOIN_CONVERSATION

## Error Message Format (GLOBAL)

```jsx
{
  "event": "ERROR",
  "data": {
    "message": "Error description"
  }
}
```

---

## Common Errors

### Invalid JWT

```jsx
{
  "event": "ERROR",
  "data": {
    "message": "Unauthorized or invalid token"
  }
}
```

---

### Forbidden Role

```jsx
{
  "event": "ERROR",
  "data": {
    "message": "Forbidden for this role"
  }
}
```

---

### Not Joined to Room

```jsx
{
  "event": "ERROR",
  "data": {
    "message": "You must join the conversation first"
  }
}
```

---

### Conversation Closed

```jsx
{
  "event": "ERROR",
  "data": {
    "message": "Conversation already closed"
  }
}
```

---

### Unauthorized Access

```jsx
{
  "event": "ERROR",
  "data": {
    "message": "Not allowed to access this conversation"
  }
}

#Example - conversation not exist
```

Invalid Request

```jsx
{
	"event": "ERROR"
	"data": {
			"message": "Invalid message format"
		}
}
or 
{
	"event": "ERROR"
	"data": {
			"message": "Unknown event"
		}
}
or
{
	"event": "ERROR"
	"data": {
			"message": "Invalid request schema"
		}
}

```
