'use strict';

//EXTERNAL DATA (For the sake of the exercise I suppose it comes from an external source)
const account1 = {
  owner: 'Jonas Schmedtmann',
  movements: [200, 455.23, -306.5, 25000, -642.21, -133.9, 79.97, 1300],
  interestRate: 1.2, // %
  pin: 1111,

  movementsDates: [
    '2019-11-18T21:31:17.178Z',
    '2019-12-23T07:42:02.383Z',
    '2020-01-28T09:15:04.904Z',
    '2020-04-01T10:17:24.185Z',
    '2020-05-08T14:11:59.604Z',
    '2020-05-27T17:01:17.194Z',
    '2020-07-11T23:36:17.929Z',
    '2020-07-12T10:51:36.790Z',
  ],
  currency: 'EUR',
  locale: 'pt-PT', // de-DE
};

const account2 = {
  owner: 'Jessica Davis',
  movements: [5000, 3400, -150, -790, -3210, -1000, 8500, -30],
  interestRate: 1.5,
  pin: 2222,

  movementsDates: [
    '2019-11-01T13:15:33.035Z',
    '2019-11-30T09:48:16.867Z',
    '2019-12-25T06:04:23.907Z',
    '2020-01-25T14:18:46.235Z',
    '2020-02-05T16:33:06.386Z',
    '2020-04-10T14:43:26.374Z',
    '2020-06-25T18:49:59.371Z',
    '2020-07-26T12:01:20.894Z',
  ],
  currency: 'USD',
  locale: 'en-US',
};

const accounts = [account1, account2];
const exchangeRate = new Map();
exchangeRate.set('EURtoUSD', 1.03).set('USDtoEUR', 0.98);

//INTERNAL DATA (Variables defined by me)

let currentAccount, timer;
let sorted = false;
let exactDate = false;

// HTML ELEMENTS
const labelWelcome = document.querySelector('.welcome');
const labelDate = document.querySelector('.date');
const labelBalance = document.querySelector('.balance__value');
const labelSumIn = document.querySelector('.summary__value--in');
const labelSumOut = document.querySelector('.summary__value--out');
const labelSumInterest = document.querySelector('.summary__value--interest');
const labelTimer = document.querySelector('.timer');

const containerApp = document.querySelector('.app');
const containerMovements = document.querySelector('.movements');

const btnLogin = document.querySelector('.login__btn');
const btnTransfer = document.querySelector('.form__btn--transfer');
const btnLoan = document.querySelector('.form__btn--loan');
const btnClose = document.querySelector('.form__btn--close');
const btnSort = document.querySelector('.btn--sort');
const btnExactDate = document.querySelector('.btn--exactDate');
const btnLogout = document.querySelector('.btn--logout');

const inputLoginUsername = document.querySelector('.login__input--user');
const inputLoginPin = document.querySelector('.login__input--pin');
const inputTransferTo = document.querySelector('.form__input--to');
const inputTransferAmount = document.querySelector('.form__input--amount');
const inputLoanAmount = document.querySelector('.form__input--loan-amount');
const inputCloseUsername = document.querySelector('.form__input--user');
const inputClosePin = document.querySelector('.form__input--pin');

//FUNCTIONS

//Formatting functions
const dateExactString = function (date) {
  //Returns a date string formatted corresponding to user's locale
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  };
  return Intl.DateTimeFormat(currentAccount.locale, options).format(date);
};

const dateSimpleString = function (date) {
  //Returns a date string formatted in a more casual way
  //The days of the week prior to the current moment get special labels
  //Time is omitted as well
  const now = new Date();
  const daysPassed = Math.floor((now - date) / (24 * 60 * 60 * 1000));
  if (daysPassed < 0) return 'Error';
  if (daysPassed === 0) return 'TODAY';
  if (daysPassed === 1) return 'YESTERDAY';
  if (daysPassed <= 7) return `${daysPassed} DAYS AGO`;
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  };
  return Intl.DateTimeFormat(currentAccount.locale, options).format(date);
};

const formatCur = function (locale, currency, amount) {
  //Returns a currency string formatted corresponding to user's locale and currency
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

//Functionality
const createAccountLogins = function (accounts) {
  //In this exercise the logins are just the user's initials
  //It is implicitly supposed that no two users share the same initials (unrealistic)
  accounts.forEach(function (account) {
    account.login = account.owner
      .split(' ')
      .map(str => str[0])
      .join('')
      .toUpperCase();
  });
};

const createMovs = function (accounts) {
  //In this exercise movements' amounts and dates come in separate arrays
  //For the purposes of the sorting function it is more convenient to have it in one place
  //Thus, the movs property is created and used instead
  accounts.forEach(function (account) {
    account.movs = [];
    account.movements.forEach(function (_, i) {
      account.movs.push({
        amount: account.movements[i],
        date: account.movementsDates[i],
      });
    });
  });
};

const displayMovements = function (account, sorted = false, exactDate = false) {
  //Function displays the movements, showing the amount, date and type of transaction (deposit or withdrawal), as well as the time of the last data update at the top
  //It allows those to be sorted by either date (default) or amount
  //  Controlled by sorted variable
  //It also allows to switch between formats of dates - casual (default) and exact
  //  Controlled by exactDate variable
  containerMovements.innerHTML = '';
  const movs = sorted
    ? account.movs.slice().sort((a, b) => a.amount - b.amount)
    : account.movs;
  movs.forEach(function (mov, i) {
    const formattedMov = formatCur(
      account.locale,
      account.currency,
      mov.amount
    );
    let movType;
    if (mov.amount > 0) movType = 'deposit';
    if (mov.amount < 0) movType = 'withdrawal';
    const html = `
    <div class="movements__row">
      <div class="movements__type movements__type--${movType}">${
      i + 1
    } ${movType}</div>
      <div class="movements__date">${
        exactDate
          ? dateExactString(new Date(mov.date))
          : dateSimpleString(new Date(mov.date))
      }</div>
      <div class="movements__value">${formattedMov}</div>
    </div>`;
    containerMovements.insertAdjacentHTML('afterbegin', html);
  });
  const now = new Date();
  labelDate.textContent = dateExactString(now);
};

const displayBalance = function (account) {
  //Calculates and displays user's balance
  //For some reason, calculates it from the entire history of transactions instead of storing it in a variable, like blockchain (Conditions of the exercise)
  account.balance = account.movs.reduce((acc, mov) => acc + mov.amount, 0);
  labelBalance.textContent = formatCur(
    account.locale,
    account.currency,
    account.balance
  );
};

const summaryDisplay = function (account) {
  //Displays a total sum of both deposits and withdrawals for the current user,
  //  as well as their interest
  const deposits = account.movs
    .filter(mov => mov.amount > 0)
    .reduce((acc, mov) => acc + mov.amount, 0)
    .toFixed(2);
  labelSumIn.textContent = formatCur(
    account.locale,
    account.currency,
    deposits
  );
  const withdrawals = account.movs
    .filter(mov => mov.amount < 0)
    .reduce((acc, mov) => acc + mov.amount, 0)
    .toFixed(2);
  labelSumOut.textContent = formatCur(
    account.locale,
    account.currency,
    Math.abs(withdrawals)
  );
  //Interest policy is as follows:
  //Each account has an interest rate, f.e. 1.2%
  //For each deposit the interest is a percentage of said deposit (determined by the interest rate) that is at least 1€
  //If said percentage of a deposit is less than 1€, the interest is considered to be 0€
  const interest = account.movs
    .filter(mov => mov.amount > 0)
    .map(deposit => +(deposit.amount * (account.interestRate / 100)).toFixed(2))
    .filter(interest => interest >= 1)
    .reduce((sum, interest) => sum + interest, 0);
  labelSumInterest.textContent = formatCur(
    account.locale,
    account.currency,
    interest
  );
};

const updateUI = function (account) {
  displayMovements(account, sorted, exactDate);
  displayBalance(account);
  summaryDisplay(account);
};

const displayInterface = function (account) {
  updateUI(account);
  containerApp.style.opacity = 100;
};

const logOut = function () {
  containerApp.style.opacity = 0;
  labelWelcome.textContent = `Log in to get started`;
  currentAccount = undefined;
};

const startLogOutTimer = function () {
  //If a user is inactive for a fixed period of time, the app logs them out
  //Global timer is used to prevent timer overlap
  if (timer) clearInterval(timer);
  let secondsLeft = 600;
  const displayTime = function () {
    labelTimer.textContent = `${Math.floor(secondsLeft / 60)}:${`${
      secondsLeft % 60
    }`.padStart(2, '0')}`;
  };
  displayTime();
  timer = setInterval(function () {
    secondsLeft--;
    if (secondsLeft === 0) {
      logOut();
      clearInterval(timer);
    }
    displayTime();
  }, 1000);
  return timer;
};

const initialise = function () {
  createAccountLogins(accounts);
  createMovs(accounts);
  //Login functionality
  btnLogin.addEventListener('click', function (e) {
    //Prevent form submission from reloading the page
    e.preventDefault();
    timer = startLogOutTimer();
    currentAccount = accounts.find(
      account =>
        account.login === inputLoginUsername.value.toUpperCase() &&
        account.pin === +inputLoginPin.value
    );
    if (!currentAccount) return;
    displayInterface(currentAccount);
    //Display message
    labelWelcome.textContent = `Welcome back, ${
      currentAccount.owner.split(' ')[0]
    }!`;
    //Clearing input fields
    inputLoginUsername.value = inputLoginPin.value = '';
    inputLoginUsername.blur();
    inputLoginPin.blur();
    sorted = false;
  });
  //Transfer functionality
  btnTransfer.addEventListener('click', function (e) {
    e.preventDefault();
    timer = startLogOutTimer();
    const receivingAccount = accounts.find(
      account => account.login === inputTransferTo.value.toUpperCase()
    );
    const transferAmount = (+inputTransferAmount.value).toFixed(2);
    if (
      receivingAccount &&
      transferAmount > 0 &&
      currentAccount.balance >= transferAmount &&
      currentAccount !== receivingAccount
    ) {
      const now = new Date().toISOString();
      currentAccount.movs.push({
        amount: -transferAmount,
        date: now,
      });
      receivingAccount.movs.push({
        amount:
          transferAmount *
          exchangeRate.get(
            `${currentAccount.currency}to${receivingAccount.currency}`
          ),
        date: now,
      });
      updateUI(currentAccount);
    }
    inputTransferTo.value = inputTransferAmount.value = '';
    inputTransferTo.blur();
    inputTransferAmount.blur();
  });
  //Loan functionality
  btnLoan.addEventListener('click', function (e) {
    e.preventDefault();
    timer = startLogOutTimer();
    //Bank policy is integer loan sums (Part of the exercise)
    const loanAmount = Math.floor(inputLoanAmount.value);
    //Bank policy is as follows:
    //  The loan is approved if there has been a deposit bigger than 10% of the loan amount
    if (
      loanAmount > 0 &&
      currentAccount.movs.some(mov => mov.amount > loanAmount * 0.1)
    ) {
      const now = new Date().toISOString();
      currentAccount.movs.push({
        amount: loanAmount,
        date: now,
      });
      updateUI(currentAccount);
    }
    inputLoanAmount.value = '';
    inputLoanAmount.blur();
  });
  //Account closing functionality
  btnClose.addEventListener('click', function (e) {
    e.preventDefault();
    if (
      currentAccount.login === inputCloseUsername.value.toUpperCase() &&
      currentAccount.pin === +inputClosePin.value
    ) {
      const removalIndex = accounts.indexOf(currentAccount);
      accounts.splice(removalIndex, 1);
      logOut();
    }
    inputCloseUsername.value = inputClosePin.value = '';
    inputCloseUsername.blur();
    inputClosePin.blur();
    sorted = false;
  });
  //Movements sorting functionality (see displayMovements for more info)
  btnSort.addEventListener('click', function (e) {
    e.preventDefault();
    timer = startLogOutTimer();
    sorted = !sorted;
    displayMovements(currentAccount, sorted, exactDate);
  });
  //Movements date format functionality (see displayMovements for more info)
  btnExactDate.addEventListener('click', function (e) {
    e.preventDefault();
    timer = startLogOutTimer();
    exactDate = !exactDate;
    displayMovements(currentAccount, sorted, exactDate);
  });
  //Logout functionality
  btnLogout.addEventListener('click', function (e) {
    e.preventDefault();
    logOut();
  });
};

initialise();
