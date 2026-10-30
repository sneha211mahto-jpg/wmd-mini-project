import { useEffect, useRef, useState } from 'react';
import { useRoomMate } from '../context/useRoomMate';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthKeyFor = (year, monthIndex) => `${String(year).padStart(4, '0')}-${String(monthIndex + 1).padStart(2, '0')}`;
const monthLabel = (month) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${monthNames[monthNumber - 1]} ${year}`;
};
const fullMonthLabel = (month) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${fullMonthNames[monthNumber - 1]} ${year}`;
};

const categoryLabel = (category) => {
  const name = String(category || 'Other').trim();
  const normalized = name.toLowerCase();
  if (normalized === 'grocery' || normalized === 'groceries') return 'Groceries';
  if (normalized === 'other' || normalized === 'others') return 'Other';
  if (normalized === 'rent') return 'Rent';
  if (normalized === 'bills') return 'Bills';
  if (normalized === 'shopping') return 'Shopping';
  return name;
};

const amountValue = (expense) => {
  const amount = Number(expense.amount);
  return Number.isFinite(amount) ? amount : 0;
};

const initialsFor = (name) =>
  name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?';

const makeAxisMaximum = (maximum) => {
  if (maximum <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  const fraction = maximum / magnitude;
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return step * magnitude;
};

const compactCurrency = (amount) => {
  if (amount >= 1000000) return `₹${(amount / 1000000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}m`;
  if (amount >= 1000) return `₹${(amount / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}k`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function ExpenseSummary() {
  const { expenses, room } = useRoomMate();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return monthKeyFor(now.getFullYear(), now.getMonth());
  });
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const monthMenuRef = useRef(null);

  const selectedExpenses = expenses.filter((expense) => String(expense.date || '').startsWith(selectedMonth));
  const totalExpenses = selectedExpenses.reduce((total, expense) => total + amountValue(expense), 0);

  const categoryColors = {
    Rent: '#75a88b',
    Groceries: '#8db8d8',
    Bills: '#d7aa62',
    Shopping: '#d98b75',
    Other: '#9b91c7',
  };
  const categoryNames = [...new Set([
    'Rent',
    'Groceries',
    'Bills',
    'Shopping',
    'Other',
    ...selectedExpenses.map((expense) => categoryLabel(expense.category)),
  ])];
  const categories = categoryNames.map((name) => ({
    name,
    amount: selectedExpenses
      .filter((expense) => categoryLabel(expense.category) === name)
      .reduce((total, expense) => total + amountValue(expense), 0),
    color: categoryColors[name] || '#7890a6',
  }));

  const payerTotals = new Map([
    ...(room?.members || []).filter((member) => !member.isOwner),
    ...(room?.owner ? [room.owner] : []),
  ]
    .map((member) => [member.name, 0]));
  for (const expense of selectedExpenses) {
    if (expense.splitType === 'room_monthly_rent') continue;
    const payer = expense.paidBy || 'Unknown';
    if (payerTotals.has(payer)) payerTotals.set(payer, payerTotals.get(payer) + amountValue(expense));
  }
  const payers = [...payerTotals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((first, second) => second.amount - first.amount || first.name.localeCompare(second.name));

  const chartMonths = selectedExpenses.length > 0
    ? [{ key: selectedMonth, label: monthLabel(selectedMonth), amount: totalExpenses }]
    : [];
  const chartMaximum = makeAxisMaximum(Math.max(0, ...chartMonths.map((month) => month.amount)));
  const chartWidth = Math.max(360, chartMonths.length * 76 + 84);
  const chartHeight = 284;
  const plot = { left: 66, right: 18, top: 18, bottom: 50 };
  const plotWidth = chartWidth - plot.left - plot.right;
  const plotHeight = chartHeight - plot.top - plot.bottom;
  const barSlot = chartMonths.length ? plotWidth / chartMonths.length : plotWidth;
  const barWidth = Math.min(38, barSlot * 0.58);
  const yTicks = Array.from({ length: 5 }, (_, index) => chartMaximum * index / 4);

  const openMonthPicker = () => {
    setPickerYear(Number(selectedMonth.slice(0, 4)));
    setMonthMenuOpen((open) => !open);
  };

  const shiftSelectedMonth = (offset) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const zeroBasedMonth = month - 1 + offset;
    const nextYear = year + Math.floor(zeroBasedMonth / 12);
    const nextMonth = (zeroBasedMonth % 12 + 12) % 12;
    if (nextYear < 1 || nextYear > 9999) return;
    setSelectedMonth(monthKeyFor(nextYear, nextMonth));
    setPickerYear(nextYear);
  };

  useEffect(() => {
    if (!monthMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!monthMenuRef.current?.contains(event.target)) setMonthMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMonthMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [monthMenuOpen]);

  return (
    <div className="page-panel expense-summary-page">
      <div className="page-header-row expense-summary-header">
        <div>
          <h1>Expense Summary</h1>
        </div>
        <div className="summary-month-picker" ref={monthMenuRef}>
          <button
            type="button"
            className="summary-month-button"
            aria-haspopup="dialog"
            aria-expanded={monthMenuOpen}
            onClick={openMonthPicker}
          >
            {monthLabel(selectedMonth)}
            <span aria-hidden="true">▾</span>
          </button>
          {monthMenuOpen && (
            <div className="summary-month-menu" role="dialog" aria-label="Choose month and year">
              <div className="summary-calendar-heading">
                <button type="button" aria-label="Previous month" onClick={() => shiftSelectedMonth(-1)}>‹</button>
                <strong>{fullMonthLabel(selectedMonth)}</strong>
                <button type="button" aria-label="Next month" onClick={() => shiftSelectedMonth(1)}>›</button>
              </div>
              <div className="summary-calendar-year">
                <button type="button" aria-label="Previous year" onClick={() => setPickerYear((year) => Math.max(1, Number(year) - 1))}>‹</button>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  aria-label="Calendar year"
                  value={pickerYear}
                  onChange={(event) => setPickerYear(event.target.value)}
                  onBlur={() => setPickerYear(String(Math.min(9999, Math.max(1, Number(pickerYear) || Number(selectedMonth.slice(0, 4))))))}
                />
                <button type="button" aria-label="Next year" onClick={() => setPickerYear((year) => Math.min(9999, Number(year) + 1))}>›</button>
              </div>
              <div className="summary-month-grid">
                {monthNames.map((month, index) => {
                  const monthKey = monthKeyFor(Number(pickerYear) || Number(selectedMonth.slice(0, 4)), index);
                  return (
                    <button
                      key={month}
                      type="button"
                      aria-pressed={monthKey === selectedMonth}
                      className={monthKey === selectedMonth ? 'selected' : ''}
                      onClick={() => {
                        setSelectedMonth(monthKey);
                        setMonthMenuOpen(false);
                      }}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="summary-hero">
        <div className="summary-metric expense-total-card">
          <span>Total Expenses</span>
          <strong>₹{totalExpenses.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      <div className="summary-layout expense-summary-layout">
        <section className="card-block expense-summary-card monthly-expenses-card">
          <div className="subheader-row">
            <h3>Monthly Expenses</h3>
          </div>
          {selectedExpenses.length === 0 ? (
            <div className="monthly-chart-empty">No expenses recorded for this month.</div>
          ) : (
            <div className="expense-chart-scroll">
              <svg
                className="expense-chart"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                style={{ width: `max(100%, ${chartWidth}px)` }}
                role="img"
                aria-label={`Monthly expenses through ${monthLabel(selectedMonth)}`}
              >
                {yTicks.map((tick) => {
                  const y = plot.top + plotHeight - tick / chartMaximum * plotHeight;
                  return (
                    <g key={tick}>
                      <line x1={plot.left} x2={chartWidth - plot.right} y1={y} y2={y} className="expense-chart-gridline" />
                      <text x={plot.left - 10} y={y + 4} textAnchor="end" className="expense-chart-axis-label">
                        {compactCurrency(tick)}
                      </text>
                    </g>
                  );
                })}
                <line
                  x1={plot.left}
                  x2={plot.left}
                  y1={plot.top}
                  y2={plot.top + plotHeight}
                  className="expense-chart-axis"
                />
                <line
                  x1={plot.left}
                  x2={chartWidth - plot.right}
                  y1={plot.top + plotHeight}
                  y2={plot.top + plotHeight}
                  className="expense-chart-axis"
                />
                {chartMonths.map((month, index) => {
                  const x = plot.left + barSlot * index + (barSlot - barWidth) / 2;
                  const barHeight = month.amount / chartMaximum * plotHeight;
                  const y = plot.top + plotHeight - barHeight;
                  const [year, monthNumber] = month.key.split('-');
                  return (
                    <g key={month.key}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(0, barHeight)}
                        rx="5"
                        className="expense-chart-bar"
                        aria-label={`${month.label}: ₹${month.amount.toLocaleString('en-IN')}`}
                      >
                        <title>{`${month.label}: ₹${month.amount.toLocaleString('en-IN')}`}</title>
                      </rect>
                      <text
                        x={x + barWidth / 2}
                        y={plot.top + plotHeight + 21}
                        textAnchor="middle"
                        className="expense-chart-month-label"
                      >
                        <tspan x={x + barWidth / 2}>{monthNames[Number(monthNumber) - 1]}</tspan>
                        <tspan x={x + barWidth / 2} dy="14">{year}</tspan>
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </section>

        <section className="card-block expense-summary-card">
          <div className="subheader-row">
            <h3>Categories</h3>
          </div>
          <div className="category-list">
            {categories.map((category) => (
              <div key={category.name} className="category-row">
                <div className="category-label">
                  <span className="dot" style={{ background: category.color }} />
                  {category.name}
                </div>
                <strong>₹{category.amount.toLocaleString('en-IN')}</strong>
              </div>
            ))}
          </div>
          {selectedExpenses.length === 0 && <p className="empty-message">No expenses recorded for this month.</p>}
        </section>

        <section className="card-block expense-summary-card">
          <div className="subheader-row">
            <h3>Who Paid Most?</h3>
          </div>
          {payers.length > 0 ? (
            <div className="leaderboard">
              {payers.map((payer) => (
                <div key={payer.name} className="leader-row">
                  <div className="summary-payer">
                    <div className="profile-mini"><span>{initialsFor(payer.name)}</span></div>
                    <span>{payer.name}</span>
                  </div>
                  <strong>₹{payer.amount.toLocaleString('en-IN')}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">No expenses recorded for this month.</p>
          )}
        </section>
      </div>
    </div>
  );
}