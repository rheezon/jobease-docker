# Job Notifier Frontend

A modern React frontend for the Job Notifier application that matches the design aesthetic of [Prashant's Portfolio](https://prashant-portfolio-py.vercel.app).

## Features

- **Authentication**: Login and signup with form validation
- **Dashboard**: View and manage job notifiers
- **Notifier Creation**: Create job notifiers with preferences and resume upload
- **Resume Processing**: Upload resume files and extract data automatically
- **Manual Editing**: Edit extracted resume data before generating LaTeX
- **Notifications**: View job notifications with relevance scores
- **Responsive Design**: Mobile-friendly interface
- **Modern UI**: Clean, professional design matching portfolio aesthetic

## Tech Stack

- **React 18** with Vite
- **React Router** for navigation
- **React Hook Form** with Yup validation
- **Axios** for API communication
- **Lucide React** for icons
- **CSS Custom Properties** for theming
- **Inter Font** for typography

## Project Structure

```
src/
├── components/
│   ├── AuthProvider.jsx      # Authentication context provider
│   └── ProtectedRoute.jsx    # Route protection component
├── pages/
│   ├── Login.jsx            # Login page
│   ├── Signup.jsx          # Signup page
│   ├── Dashboard.jsx       # Main dashboard
│   ├── CreateNotifier.jsx  # Notifier creation form
│   └── Notifications.jsx   # Notifications view
├── services/
│   └── api.js              # API service layer
├── hooks/
│   └── useAuth.js          # Authentication hook
├── utils/
│   └── resumeExtraction.js # Resume processing utilities
├── App.jsx                 # Main app component
├── App.css                 # Component styles
└── index.css               # Global styles
```

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Backend API running on `http://localhost:8080`

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## API Integration

The frontend integrates with the Job Notifier backend API:

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Notifier Endpoints
- `GET /api/notifiers` - Get all notifiers
- `POST /api/notifiers` - Create notifier
- `GET /api/notifiers/{id}` - Get single notifier
- `PUT /api/notifiers/{id}` - Update notifier
- `DELETE /api/notifiers/{id}` - Delete notifier

### Notification Endpoints
- `GET /api/notifications/notifier/{id}` - Get notifications
- `PUT /api/notifications/{id}/viewed` - Mark as viewed

## Design System

The frontend uses a consistent design system inspired by modern portfolio designs:

### Color Palette
- **Primary**: `#2563eb` (Blue)
- **Secondary**: `#64748b` (Slate)
- **Success**: `#10b981` (Emerald)
- **Warning**: `#f59e0b` (Amber)
- **Error**: `#ef4444` (Red)

### Typography
- **Font Family**: Inter (Google Fonts)
- **Font Weights**: 300, 400, 500, 600, 700
- **Responsive**: Scales appropriately on mobile devices

### Spacing
- Uses CSS custom properties for consistent spacing
- Responsive spacing that adapts to screen size

### Components

#### Authentication Forms
- Clean, centered design with subtle shadows
- Form validation with error states
- Password visibility toggle
- Loading states during submission

#### Dashboard
- Card-based layout for notifiers
- Empty state with call-to-action
- Responsive grid system
- Notification badges for unread items

#### Notifier Creation
- Multi-section form with clear progression
- File upload with drag-and-drop styling
- Resume data extraction and editing
- LaTeX preview with syntax highlighting

#### Notifications
- Relevance scoring with color coding
- Expandable job details
- Resume download links
- Mark as viewed functionality

## Resume Processing

The application includes a comprehensive resume processing system:

### File Upload
- Supports PDF, DOC, and DOCX files
- Visual upload area with drag-and-drop styling
- File validation and error handling

### Data Extraction
- Mock implementation for demonstration
- Extracts: name, email, phone, skills, experience, education
- Structured data validation

### Manual Editing
- Form-based editing of extracted data
- Real-time validation
- Required field indicators

### LaTeX Generation
- Professional LaTeX template
- Dynamic content insertion
- Syntax highlighting in preview

## State Management

The application uses React Context for state management:

### Authentication Context
- User login/logout state
- JWT token management
- Protected route handling
- Automatic token refresh

### Form State
- React Hook Form for form management
- Yup schema validation
- Error handling and display
- Loading states

## Error Handling

Comprehensive error handling throughout the application:

- **API Errors**: Centralized error handling with user-friendly messages
- **Form Validation**: Real-time validation with clear error messages
- **Network Errors**: Graceful handling of network issues
- **Authentication Errors**: Automatic redirect to login on token expiry

## Responsive Design

The application is fully responsive:

- **Mobile First**: Designed for mobile devices first
- **Breakpoints**: Responsive breakpoints at 768px
- **Flexible Layouts**: CSS Grid and Flexbox for adaptive layouts
- **Touch Friendly**: Appropriate touch targets for mobile

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- ESLint configuration for consistent code style
- Prettier for code formatting
- Component-based architecture
- Custom hooks for reusable logic

## Future Enhancements

- **Real Resume Parsing**: Integration with actual PDF parsing libraries
- **Advanced Filtering**: More sophisticated job filtering options
- **Dark Mode**: Toggle between light and dark themes
- **Offline Support**: Service worker for offline functionality
- **Push Notifications**: Real-time job notifications
- **Analytics**: User engagement tracking
- **A/B Testing**: Feature experimentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details