import { AnimatePresence } from 'framer-motion';
import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import AppContainer from './container/App/AppContainer';
import './styles/app.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

class ErrorBoundary extends Component {
  constructor(props: any) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {}
  componentDidCatch(error: any, errorInfo: any) {
    // alert(JSON.stringify(error));
  }
  render() {
    // @ts-ignore
    return this.props.children; 
  }
}

if (process.env.REACT_APP_MODE && process.env.REACT_APP_MODE === 'preview') {
  root.render(
    <ErrorBoundary>
      <AnimatePresence initial={true} exitBeforeEnter>
        <AppContainer />
      </AnimatePresence>
    </ErrorBoundary>
  );
} else {
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.measurementApp = {
      basePath: '',
      init(options: any) {
        this.basePath = options.basePath;
      },
      open() {
        root.render(
          <ErrorBoundary>
            <AnimatePresence initial={true} exitBeforeEnter>
              <AppContainer measurementCore={this} measurementCorePath={this.basePath} />
            </AnimatePresence>
          </ErrorBoundary>
        );
      },
      close() {
        root.render('');
      }
    };
  }
}

