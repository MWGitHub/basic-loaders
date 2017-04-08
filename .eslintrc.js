module.exports = {
  'extends': 'airbnb',
    'plugins': [
        'react',
        'jsx-a11y',
        'import'
    ],
    'env': {
      'browser': true
    },
    'globals': {
      'THREE': true
    },
    'rules': {
      'comma-dangle': 0,
      'no-plusplus': 0,
      'no-bitwise': 0,
      'no-mixed-operators': 0,
      'no-continue': 0,
      'no-unused-expressions': ['error', {
        allowShortCircuit: true
      }]
    }
};
