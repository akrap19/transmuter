import { formatAmount } from "@/lib/catalog/format";
import type { RedeemLeg } from "@/lib/catalog/types";

export function RedeemLegs({ legs }: { legs: RedeemLeg[] }) {
  return (
    <div className="tbl-scroll catalog-table-wrap">
      <table className="catalog-table">
        <thead>
          <tr>
            <th>Leg</th>
            <th>Owed</th>
            <th>Paid</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {legs.map((leg) => {
            const remaining = leg.owed - leg.paid;
            const status = remaining <= 0 ? (leg.owed > 0 ? "Paid" : "None") : "Unpaid";
            return (
              <tr key={leg.asset}>
                <td>{leg.asset}</td>
                <td>{formatAmount(leg.owed)}</td>
                <td>{formatAmount(leg.paid)}</td>
                <td>{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
