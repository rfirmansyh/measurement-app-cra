import classNames from 'classnames';
import { motion, Variants } from 'framer-motion';
import {
  Component, createRef, memo, ReactNode, useCallback, useEffect, useLayoutEffect, 
} from 'react';
import ReactDOM from 'react-dom';
import Content from './Content';

type TModalVariants = 'default' | 'alert';
export interface ModalProps {
  show?: boolean;
  variant?: TModalVariants
  size?: 'xs' | 'sm' | 'md' | 'lg';
  btnClose?: boolean;
  btnClosePosition?: 'top-right' | 'bottom-right';
  btnCloseClassName?: string;
  dialogClassName?: string;
  children?: ReactNode;
  onHide?(): void;
}


const animateBackdropVariants: Variants = {
  show: { 
    visibility: 'visible',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
  },
  hide: { 
    backgroundColor: 'rgba(0, 0, 0, 0.1)', 
    transitionEnd: {
      visibility: 'hidden',
    },
  },
};
const animateDialogVariants = (variantType: TModalVariants):Variants => {
  if (variantType === 'alert') {
    return {
      show: { 
        opacity: 1,
        scale: 1,
      },
      hide: { 
        opacity: 1,
        scale: .8,
      },
    };
  }
  return {
    show: { 
      opacity: 1,
      y: 0,
    },
    hide: { 
      opacity: 0,
      y: -80,
    },
  };
};
const Modal = memo((props: ModalProps) => {
  const {
    show,
    variant = 'default',
    size = 'md',
    btnClose,
    btnClosePosition = 'top-right',
    btnCloseClassName,
    dialogClassName,
    children,
    onHide,
  } = props;

  /* logic */
  const modalDialogClass = classNames({
    'bg-white w-auto relative my-[25px] mx-auto rounded-[15px] overflow-hidden': true,
    'max-w-[690px]': size === 'lg',
    'max-w-[720px]': size === 'md',
    'max-w-[480px]': size === 'sm',
    'max-w-[380px]': size === 'xs',
  }, dialogClassName);
  const btnCloseClass = classNames({
    'block w-[18px] h-[18px] cursor-pointer fill-current text-tlc-blue absolute z-[99]': true,
    'right-8 bottom-8': btnClosePosition === 'bottom-right',
    'right-8 top-8': btnClosePosition === 'top-right',
  }, btnCloseClassName);
  
  /* handler */
  const handleOnHide = useCallback(() => {
    if (onHide) {
      onHide();
    }
  }, [onHide]);

  /* effect */
  useEffect(() => {
    if (show) {
      document.querySelector('body')?.classList.add('modal-show');
    } else {
      document.querySelector('body')?.classList.remove('modal-show');
    }

    return () => {
      if (window.document) {
        document.querySelector('body')?.classList.remove('modal-show');
      }
    };
  }, [show]);


  return (
    <motion.div
      initial={show ? 'show' : 'hide'}
      animate={show ? 'show' : 'hide'}
      variants={animateBackdropVariants}
      transition={variant === 'alert' ? { duration: 0.1 } : { duration: 0.3 }}
      className="fixed top-0 right-0 left-0 bottom-0 z-[7048] !overflow-x-hidden overflow-y-auto px-[5px]"
      onClick={handleOnHide}
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      {/* modal-dialog */}
      <motion.div 
        onClick={(e) => e.stopPropagation()} 
        initial={show? 'show' : 'hide'}
        animate={show ? 'show' : 'hide'}
        variants={animateDialogVariants(variant)}
        transition={variant === 'alert' ? { duration: 0.1 } : { duration: 0.3 }}
        className={modalDialogClass}
      >
        {/* modal-content */} 
        <div className="w-full">
          {/* close button */}
          {btnClose && (
            <button
              type="button" 
              onClick={handleOnHide}
              className={btnCloseClass}>
              <svg
                width="100%"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.71791 0L11.5182 9.52394L19.3185 0H23L13.3407 11.662L22.7084 23H19.0269L11.5182 13.8L4.00951 23H0.291601L9.65927 11.662L0 0H3.71791Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}

          {children}
        </div>
      </motion.div>
    </motion.div>
  );
});

export default Object.assign(Modal, {
  Content,
});