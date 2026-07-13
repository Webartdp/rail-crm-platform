const leistungsarten = [
  'WTU',
  'WSU',
  'E-WU',
  'Rb',
  'Azf',
  'RID-Kontrolle',
  'Zugbeschtreifung',
  'Своя услуга',
];

const timeline = [
  { time: '06:40', title: 'Дорога из дома начата / Gasfahrt', place: 'Дом сотрудника', status: 'done' },
  { time: '07:18', title: 'Дорога завершена', place: 'Место работы: путь 12', status: 'done' },
  { time: '07:25', title: 'Начало работы / Dienstbeginn', place: 'Место работы: путь 12', status: 'active' },
  { time: '--:--', title: 'Завершить работу / Stop', place: 'Ожидает действия сотрудника', status: 'pending' },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Rail CRM Platform</p>
          <h1>Экран сотрудника в поле</h1>
          <p className="hero-text">
            Главная страница сейчас показывает понятный макет. Рабочая кнопка, которая реально отправляет событие в backend, находится на странице демо.
          </p>
          <a className="action-link" href="/demo">Открыть рабочий demo-flow</a>
        </div>
        <div className="status-pill">Статус: макет</div>
      </section>

      <section className="grid">
        <div className="panel action-panel">
          <h2>Действия</h2>
          <a className="action-button secondary" href="/demo">Gasfahrt — выезд из дома</a>
          <a className="action-button secondary" href="/demo">Gasfahrt beendet — прибыл</a>
          <a className="action-button primary" href="/demo">Dienstbeginn — начало работы</a>
          <a className="action-button warning" href="/demo">Stop — завершить работу</a>
          <a className="action-button secondary" href="/demo">Start Dienstfahrt — переезд</a>
          <a className="action-button secondary" href="/demo">Stop Dienstfahrt — прибыл на следующий объект</a>
          <p className="hint">
            Это ссылки на рабочий экран /demo. На самом demo backend сам решает, какая следующая кнопка разрешена.
          </p>
          <p className="hint">
            Если фактическое время больше планового, кнопка Stop требует заполнить комментарий / Bemerkung.
          </p>
        </div>

        <div className="panel">
          <h2>Данные задания</h2>
          <div className="form-grid">
            <label>
              Дата
              <input value="2026-07-06" readOnly />
            </label>
            <label>
              Тип услуги / Leistungsart
              <select defaultValue="WTU">
                {leistungsarten.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Референс / Referenznummer
              <input placeholder="например REF-2026-001" />
            </label>
            <label>
              Номер поезда / Zugnummer
              <input placeholder="например ICE 204" />
            </label>
            <label>
              Место работы / Einsatzort
              <input placeholder="место, станция или путь" />
            </label>
            <label>
              Комментарий / Bemerkung
              <textarea placeholder="обязательно, если время превышено" />
            </label>
          </div>
        </div>
      </section>

      <section className="grid lower-grid">
        <div className="panel">
          <h2>Лента событий</h2>
          <div className="timeline">
            {timeline.map((item) => (
              <div className={`timeline-item ${item.status}`} key={item.title}>
                <strong>{item.time}</strong>
                <div>
                  <p>{item.title}</p>
                  <span>{item.place}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel map-placeholder">
          <h2>Позиция Google Maps</h2>
          <div className="map-box">
            <span>Здесь будет карта</span>
          </div>
          <p className="hint">Координаты сохраняются backend-ом и потом отображаются на карте.</p>
        </div>
      </section>
    </main>
  );
}
