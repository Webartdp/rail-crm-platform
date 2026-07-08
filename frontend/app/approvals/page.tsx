'use client';

import { useEffect, useState } from 'react';
import { getWorkEventApprovals, setWorkEventApprovalStatus, type WorkEventApproval } from '../../lib/approvals';

export default function ApprovalsPage() {
  const [items, setItems] = useState<WorkEventApproval[]>([]);
  const [message, setMessage] = useState('Loading approvals...');

  async function load() {
    try {
      const response = await getWorkEventApprovals();
      setItems(response.data);
      setMessage(response.data.length ? 'Loaded from API.' : 'No completed event pairs yet.');
    } catch (error) {
      setMessage('API not available.');
    }
  }

  async function change(action: 'approve' | 'reject', item: WorkEventApproval) {
    try {
      await setWorkEventApprovalStatus(action, item);
      await load();
    } catch (error) {
      setMessage('Could not update approval.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Approvals</p>
          <h1>Approval Queue</h1>
          <p className="hero-text">Review completed work and travel intervals before cost calculation.</p>
        </div>
        <div className="status-pill">{items.filter((item) => item.status === 'pending').length} pending</div>
      </section>

      <section className="panel">
        <p className="hint">{message}</p>
        <div className="table-row"><strong>Interval</strong><strong>Status</strong><strong>Action</strong></div>
        {items.map((item) => (
          <div className="table-row" key={`${item.employee_id}-${item.assignment_id}-${item.pair_type}-${item.start_time}-${item.stop_time}`}>
            <span>{item.pair_type} / employee #{item.employee_id} / Auftrag #{item.assignment_id} / {item.minutes} min</span>
            <span>{item.status}</span>
            <span>
              <button className="action-link" onClick={() => change('approve', item)} type="button">Approve</button>
              <button className="action-link" onClick={() => change('reject', item)} type="button">Reject</button>
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
