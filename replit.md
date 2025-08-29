# ProductFinder

## Overview

ProductFinder is a React-based web application that enables users to search for products using image recognition technology. Users can upload or drag-and-drop images of products, and the application uses Google Cloud Vision API to analyze the image and extract product information. The app then searches for similar products across different retailers using a Real-Time Product Search API, allowing users to compare prices and find purchasing options.

The application focuses on helping users identify products they've seen (like toys their children might want) and find where to buy them at competitive prices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with Vite as the build tool for fast development and optimized production builds
- **UI Library**: Bootstrap 5.3.2 for responsive design and pre-built components
- **State Management**: React hooks for local component state management
- **File Handling**: Custom drag-and-drop interface with support for HEIC image conversion using heic2any
- **Image Processing**: react-image-file-resizer for optimizing uploaded images before API calls
- **Component Structure**: Modular component architecture with separate utility functions for API interactions

### Image Processing Pipeline
- **File Upload**: Supports drag-and-drop and traditional file input methods
- **Format Conversion**: Automatically converts HEIC images to web-compatible formats
- **Image Optimization**: Resizes images to reduce API payload size
- **Base64 Encoding**: Converts images to base64 for Google Vision API compatibility

### API Integration Strategy
- **Vision Analysis**: Google Cloud Vision API for text extraction and web detection from uploaded images
- **Product Search**: Real-Time Product Search API from RapidAPI for finding products across multiple retailers
- **Data Transformation**: Custom utility functions to standardize product data from different sources

### Component Architecture
- **ImageAnalysis**: Main component handling image upload and analysis workflow
- **ProductCard**: Individual product display component with retailer information
- **ProductCarousel**: Carousel component for displaying multiple product results
- **ProductGrid**: Grid layout for organized product display
- **DragDrop**: Custom drag-and-drop interface component

### Styling Strategy
- **CSS Custom Properties**: Consistent color scheme and sizing using CSS variables
- **Responsive Design**: Bootstrap grid system with custom CSS for component-specific styling
- **Typography**: Lexend Zetta font for modern, tech-focused aesthetic
- **Theming**: Centralized color palette with dark/light theme support

## External Dependencies

### APIs and Services
- **Google Cloud Vision API**: Primary service for image analysis, text extraction, and web detection
- **Real-Time Product Search API (RapidAPI)**: Retrieves product information and pricing from multiple retailers
- **Environment Variables**: Secure API key management through Vite's environment variable system

### Third-Party Libraries
- **Image Processing**: heic2any for HEIC format support, react-image-file-resizer for optimization
- **HTTP Client**: Axios for API requests with better error handling than fetch
- **UI Components**: Bootstrap for base styling, react-responsive-modal for modal dialogs
- **Interactive Elements**: react-slick with slick-carousel for product carousels
- **Development Tools**: Vite for build tooling, Vitest for testing, ESLint for code quality

### Development Infrastructure
- **Build System**: Vite for fast development server and optimized production builds
- **Testing Framework**: Vitest with jsdom for component testing and React Testing Library
- **Code Quality**: ESLint with React-specific rules for consistent code standards
- **Deployment**: Configured for Netlify deployment with environment variable support