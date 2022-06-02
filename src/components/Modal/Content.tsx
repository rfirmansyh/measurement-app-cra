import classNames from 'classnames';
import { ComponentPropsWithoutRef } from 'react';

interface ContentProps extends ComponentPropsWithoutRef<'div'> {
  noDefaultStyle?: boolean;
}

const Content = (props: ContentProps) => {
  const {
    className,
    children,
    noDefaultStyle = false,
    ...rest
  } = props;

  const contentClass = classNames({
    'w-full': true,
    'bg-white': !noDefaultStyle,
  }, className);

  return (
    <div className={contentClass} {...rest}>
      {children}
    </div>
  );
};

export default Content;