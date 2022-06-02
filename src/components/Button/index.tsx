import classNames from 'classnames';
import React, { ComponentPropsWithRef, forwardRef } from 'react';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant: 'outline' | 'filled';
  isLoading?: boolean;
}
const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    variant,
    children,
    disabled,
    isLoading,
    className,
    ...rest
  } = props;

  const rootClass = classNames({
    'flex items-center rounded-[5px] justify-center text-center': true,
    'py-[11px] px-[16px] text-[16px] border-2 border-primary text-primary': variant === 'outline',
    'py-[12px] px-[17px] text-[16px] bg-gradient-to-r from-primary to-[#529FFB] text-white': variant === 'filled',
    'opacity-50': disabled,
  }, className);

  if (variant === 'outline') {
    return (
      <button className={rootClass} disabled={disabled} {...rest}>
        {isLoading && (
          <svg className="w-5 h-5 mr-2 text-white animate-spin flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        <span>{children}</span>
      </button>
    );
  }
  return (
    <button className={rootClass} disabled={disabled} {...rest}>
      {isLoading && (
        <svg className="w-5 h-5 mr-2 text-white animate-spin flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <span>{children}</span>
    </button>
  );
});

export default Button;