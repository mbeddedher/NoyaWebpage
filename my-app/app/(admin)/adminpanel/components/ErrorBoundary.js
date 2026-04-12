'use client';
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true, 
      error: error instanceof Error ? error : new Error('An unknown error occurred') 
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error safely
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error caught by boundary:', {
      message: errorMessage,
      stack: errorStack,
      componentStack: errorInfo?.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error);
    }

    return this.props.children;
  }
} 