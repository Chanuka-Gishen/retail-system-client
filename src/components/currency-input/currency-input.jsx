import React from 'react';
import PropTypes from 'prop-types';
import { NumericFormat } from 'react-number-format';

export const CurrencyInput = React.forwardRef(function CurrencyInput(props, ref) {
  const { onChange, value, onFocus, onBlur, ...other } = props;
  const [isFocused, setIsFocused] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleFocus = (event) => {
    setIsFocused(true);
    // Auto-clear if value is 0 or 0.00
    if (value === 0 || value === '0' || value === '0.00') {
      setDisplayValue('');
    }
    if (onFocus) onFocus(event);
  };

  const handleBlur = (event) => {
    setIsFocused(false);
    // Restore 0.00 if empty
    if (!displayValue || displayValue === '') {
      setDisplayValue('0');
      onChange({
        target: {
          name: props.name,
          value: 0,
        },
      });
    }
    if (onBlur) onBlur(event);
  };

  const handleValueChange = (values) => {
    const newValue = values.value === '' ? '' : values.value;
    setDisplayValue(newValue);

    // Convert empty string to 0 for Formik
    const finalValue = newValue === '' ? 0 : parseFloat(newValue);

    onChange({
      target: {
        name: props.name,
        value: finalValue,
      },
    });
  };

  return (
    <NumericFormat
      {...other}
      getInputRef={ref}
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onValueChange={handleValueChange}
      decimalScale={2}
      fixedDecimalScale={!isFocused} // Don't show decimals when focused and empty
      allowNegative={false}
      thousandSeparator
      valueIsNumericString
      prefix={isFocused && displayValue === '' ? '' : 'Rs. '}
    />
  );
});

CurrencyInput.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
