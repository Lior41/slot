import { randomUUID } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { transaction } from "./db";
import { localInstant } from "@/lib/time";
export async function createDemoWorkspace() {
  return transaction(async (c) => {
    const workspaceId = randomUUID(),
      coach = randomUUID(),
      client = randomUUID(),
      second = randomUUID();
    await c.query(
      "INSERT INTO workspaces(id,name,expires_at) VALUES($1,'Forma Training Club',now()+interval '24 hours')",
      [workspaceId],
    );
    for (const [id, name, email, role] of [
      [coach, "Noa Ben-Ami", "noa@forma.example", "COACH"],
      [client, "Alex Morgan", "alex@example.test", "CLIENT"],
      [second, "Sam Rivera", "sam@example.test", "CLIENT"],
    ]) {
      await c.query("INSERT INTO people(id,workspace_id,name,email,role) VALUES($1,$2,$3,$4,$5)", [
        id,
        workspaceId,
        name,
        email,
        role,
      ]);
    }
    for (let day = 1; day <= 7; day++)
      for (const [start, end] of [
        [420, 720],
        [840, 1200],
      ])
        await c.query(
          "INSERT INTO availability(id,workspace_id,coach_id,weekday,start_min,end_min) VALUES($1,$2,$3,$4,$5,$6)",
          [randomUUID(), workspaceId, coach, day, start, end],
        );
    const services = [
      [
        "Personal training",
        "Focused coaching. A session built around your movement and goals.",
        50,
        10,
        1,
        22000,
      ],
      [
        "Strength club",
        "Small group. Big energy. Build confidence with the fundamentals.",
        45,
        15,
        6,
        8500,
      ],
      [
        "Mobility reset",
        "Make room to move. A slower session for balance and control.",
        40,
        20,
        8,
        6500,
      ],
    ] as const;
    const ids: string[] = [];
    for (const [name, description, duration, buffer, capacity, price] of services) {
      const id = randomUUID();
      ids.push(id);
      await c.query(
        "INSERT INTO services(id,workspace_id,name,description,duration,buffer,capacity,price) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [id, workspaceId, name, description, duration, buffer, capacity, price],
      );
    }
    const tomorrow = Temporal.Now.zonedDateTimeISO("Asia/Jerusalem").toPlainDate().add({ days: 1 });
    for (let day = 0; day < 7; day++)
      for (const [index, hour] of [
        [0, 8],
        [1, 10],
        [2, 15],
        [0, 17],
        [1, 18],
      ]) {
        const date = tomorrow.add({ days: day }).toString(),
          start = localInstant(`${date}T${String(hour).padStart(2, "0")}:00`, "Asia/Jerusalem");
        const end = new Date(Date.parse(start) + services[index][2] * 60000).toISOString();
        await c.query(
          "INSERT INTO slots(id,workspace_id,service_id,coach_id,starts_at,ends_at,blocked_until,capacity,price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            randomUUID(),
            workspaceId,
            ids[index],
            coach,
            start,
            end,
            new Date(Date.parse(end) + services[index][3] * 60000).toISOString(),
            services[index][4],
            services[index][5],
          ],
        );
      }
    return { workspaceId, personId: client };
  });
}
