import classNames from 'classnames';
import { ComponentPropsWithoutRef } from 'react';

interface InputProps extends ComponentPropsWithoutRef<'input'> {
  error?: string;
}
const Input = (props: InputProps) => {
  const {
    error,
    ...rest
  } = props;

  const rootClass = classNames({
    'border-b text-center py-3 px-2 text-black w-full max-w-[280px] outline-none': true,
    'placeholder:font-light': true,
    'transition-all': true,
    'focus:border-b-primary border-gray/50': !error,
    'focus:border-b-danger border-danger': !!error,
  });

  return (
    <div className="my-6">
      <input 
        type="email" 
        placeholder="Type your Email"
        className={rootClass}
        {...rest}
      />
      {error && <div className="mt-2 text-[10px] text-danger font-light">{error}</div>}
    </div>
  );
};

export default Input;