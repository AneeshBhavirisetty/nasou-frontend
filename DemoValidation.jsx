import { useState } from 'react';

export default function DemoValidation() {
  const [values, setValues] = useState(['', '']);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState([false, false]); // Track which inputs have been touched

  const handleInputChange = (index, e) => {
    const value = e.target.value;
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);

    // Mark as touched when user starts typing
    const newTouched = [...touched];
    newTouched[index] = true;
    setTouched(newTouched);

    // Clear error for this input when user types (if it was previously invalid)
    if (errors[index]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };

  const handleInputBlur = (index, e) => {
    const value = e.target.value;
    // Validate when leaving the field
    validateInput(index, value);
  };

  const validateInput = (index, value) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      let isValid = true;
      let errorMessage = '';

      // Validation: first input must be between 1-7 (not 8 or 9)
      if (index === 0) {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1 || num > 7 || value === '') {
          isValid = false;
          errorMessage = `Please enter a number between 1-7`;
        }
      }
      // Second input: just require it to be filled
      else if (value === '') {
        isValid = false;
        errorMessage = 'This field is required';
      }

      if (isValid) {
        delete newErrors[index];
      } else {
        newErrors[index] = errorMessage;
      }
      return newErrors;
    });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Input Validation Demo</h2>
      <p className="text-sm text-gray-500 mb-6">
        Validation occurs when you leave each input. Try entering 8 or 9 in first input then tabbing out.
      </p>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            First Input (1-7 only):
          </label>
          <input
            type="text"
            value={values[0] || ''}
            onChange={(e) => handleInputChange(0, e)}
            onBlur={(e) => handleInputBlur(0, e)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md
                       ${touched[0] && errors[0] ? 'border-red-500' : ''}
                       focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Enter 1-7"
          />
          {touched[0] && errors[0] && (
            <p className="mt-1 text-sm text-red-600">{errors[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Second Input (required):
          </label>
          <input
            type="text"
            value={values[1] || ''}
            onChange={(e) => handleInputChange(1, e)}
            onBlur={(e) => handleInputBlur(1, e)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md
                       ${touched[1] && errors[1] ? 'border-red-500' : ''}
                       focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Enter something"
          />
          {touched[1] && errors[1] && (
            <p className="mt-1 text-sm text-red-600">{errors[1]}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            // Manual validation check for submit
            let isValid = true;
            values.forEach((value, index) => {
              if (!touched[index]) {
                // Force validation on untouched fields when submitting
                validateInput(index, value);
              }
              if (errors[index]) isValid = false;
            });

            if (isValid) {
              alert('Form submitted successfully!');
              // Reset form
              setValues(['', '']);
              setErrors({});
              setTouched([false, false]);
            }
          }}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          Submit Form
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Current Values:</h3>
        <p className="text-sm text-gray-600">
          Input 1: <span className="font-mono">{values[0] || '(empty)'}</span><br/>
          Input 2: <span className="font-mono">{values[1] || '(empty)'}</span>
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Touched: Input 1: {touched[0].toString()} | Input 2: {touched[1].toString()}
        </p>
      </div>
    </div>
  );
}