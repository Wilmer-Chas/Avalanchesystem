const FUNDAMENTALS = [
  {
    title: 'Cells hold stress',
    body: 'Each square stores a stress value — built-up strain, like a sand pile on that spot.',
  },
  {
    title: 'Hit the limit → empty to zero',
    body: 'When a cell reaches the failure threshold, it collapses to 0 and sheds its whole load.',
  },
  {
    title: 'Only drops add stress',
    body: 'New stress enters only from the random drops. A collapse does not create or destroy load — it moves it.',
  },
  {
    title: 'Neighbors can avalanche too',
    body: 'Shed stress is split north, east, south, and west. If a neighbor then exceeds the threshold, it also collapses and sheds — that chain is the earthquake.',
  },
] as const

export function FundamentalsPanel() {
  return (
    <section className="fundamentals" aria-label="Model fundamentals">
      <h2 className="panel-title">The four ideas</h2>
      <ol className="fundamentals-list">
        {FUNDAMENTALS.map((item, i) => (
          <li key={item.title}>
            <span className="fundamentals-index">{i + 1}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
