export default function EmployeePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Сотрудник</p>
          <h1>Мой рабочий день</h1>
          <p className="hero-text">Рабочий экран сотрудника для заданий, выезда, начала работы и действий на объекте.</p>
        </div>
        <div className="status-pill">Задание назначено</div>
      </section>

      <section className="grid">
        <div className="panel action-panel">
          <h2>Текущее задание</h2>
          <p><strong>Тип услуги / Leistungsart:</strong> WTU</p>
          <p><strong>Референс / Referenznummer:</strong> REF-2026-001</p>
          <p><strong>Номер поезда / Zugnummer:</strong> ICE 204</p>
          <p><strong>Место работы / Einsatzort:</strong> Gleis 12</p>
          <a className="action-link" href="/demo">Открыть демо workflow</a>
        </div>

        <div className="panel">
          <h2>Сегодня</h2>
          <div className="timeline-item done"><strong>06:40</strong><div><p>Gasfahrt — выезд из дома</p><span>Готово для подключения live tracking</span></div></div>
          <div className="timeline-item pending"><strong>--:--</strong><div><p>Dienstbeginn — начало работы</p><span>Ожидает действия сотрудника</span></div></div>
        </div>
      </section>
    </main>
  );
}
