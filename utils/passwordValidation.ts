export interface PasswordValidationResult {
  isValid: boolean;
  errorMessage: string;
  criteria: {
    hasMinLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasUniqueKey: boolean;
  };
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const pwd = password || '';
  const hasMinLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasUniqueKey = /[^A-Za-z0-9]/.test(pwd);

  const isValid = hasMinLength && hasUpper && hasLower && hasNumber && hasUniqueKey;

  let errorMessage = '';
  if (!hasMinLength) {
    errorMessage = 'Password must be at least 8 characters long.';
  } else if (!hasUpper) {
    errorMessage = 'Password must contain at least one uppercase letter (Big Letter, halimbawa: A-Z).';
  } else if (!hasLower) {
    errorMessage = 'Password must contain at least one lowercase letter (small letter, halimbawa: a-z).';
  } else if (!hasNumber) {
    errorMessage = 'Password must contain at least one number (numero, halimbawa: 0-9).';
  } else if (!hasUniqueKey) {
    errorMessage = 'Password must contain at least one unique key / special character (halimbawa: _, -, @, #, $, !).';
  }

  return {
    isValid,
    errorMessage,
    criteria: {
      hasMinLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasUniqueKey,
    },
  };
}
