# CyberTask Frontend

A modern, responsive React application for task management built with TypeScript, Vite, and Tailwind CSS.

## 🚀 Features

- **Modern UI/UX**: Clean, responsive design with Tailwind CSS
- **Authentication**: JWT-based login/register with protected routes
- **Task Management**: Create, edit, delete, and organize tasks
- **Kanban Board**: Drag-and-drop task board with status columns
- **Project Management**: Organize tasks by projects
- **Real-time Notifications**: Toast notifications for user feedback
- **State Management**: Redux Toolkit for efficient state management
- **Type Safety**: Full TypeScript support
- **Performance**: Optimized with Vite build tool

## 🛠️ Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Yup validation
- **HTTP Client**: Axios
- **UI Components**: Headless UI + Heroicons
- **Animations**: Framer Motion
- **Notifications**: React Hot Toast
- **Drag & Drop**: React Beautiful DND

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cybertask/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── common/         # Common UI components
│   ├── layout/         # Layout components
│   └── tasks/          # Task-specific components
├── hooks/              # Custom React hooks
├── pages/              # Page components
│   ├── auth/           # Authentication pages
│   └── [other pages]   # Feature pages
├── services/           # API service layer
├── store/              # Redux store and slices
│   └── slices/         # Redux slices
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 UI Components

### Common Components
- **Button**: Customizable button with variants and loading states
- **Modal**: Animated modal with different sizes
- **Loading**: Spinner component with size variants

### Task Components
- **TaskCard**: Display task information with drag-and-drop support
- **CreateTaskModal**: Form modal for creating new tasks

### Layout Components
- **Navbar**: Main navigation with user menu
- **Layout**: Common page layout wrapper
- **ProtectedRoute**: Route guard for authentication

## 🔐 Authentication

The app implements JWT-based authentication with:
- Login/Register forms with validation
- Automatic token handling
- Protected routes
- User session management

## 📊 State Management

Using Redux Toolkit with organized slices:
- **authSlice**: User authentication state
- **taskSlice**: Task management state
- **projectSlice**: Project management state
- **notificationSlice**: Notification state

## 🎯 Key Features

### Dashboard
- Task statistics and overview
- Recent tasks display
- Project summary
- Quick actions

### Task Management
- CRUD operations for tasks
- Priority and status management
- Due date tracking
- Tag system

### Kanban Board
- Drag-and-drop functionality
- Real-time status updates
- Visual task organization
- Column-based workflow

### Projects
- Project creation and management
- Team collaboration features
- Project-specific task filtering

## 🚀 Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting service

### Environment Variables for Production
```
VITE_API_URL=https://your-api-domain.com/api
```

## 🤝 API Integration

The frontend expects a REST API with the following endpoints:

- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user
- `GET /tasks` - Get tasks
- `POST /tasks` - Create task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `GET /projects` - Get projects
- `POST /projects` - Create project

## 🎨 Customization

### Themes
Customize the theme in `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      primary: {
        // Your brand colors
      }
    }
  }
}
```

### Components
All components are highly customizable with props and CSS classes.

## 🐛 Troubleshooting

### Common Issues

1. **Build fails**: Check TypeScript errors and fix them
2. **API connection**: Verify `VITE_API_URL` in your `.env` file
3. **Routing issues**: Ensure React Router is properly configured

### Development Tips

- Use TypeScript for better development experience
- Follow the existing component patterns
- Keep state management organized with Redux slices
- Use the provided hooks for common functionality

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and lint
5. Submit a pull request

## 🔗 Related

- [Backend API Documentation](../backend/README.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)
- [API Reference](../docs/API.md)