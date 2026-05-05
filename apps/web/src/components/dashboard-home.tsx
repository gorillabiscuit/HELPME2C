import { Mono } from '@helpme2c/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardHomeProps {
  firstName: string | null | undefined;
  serverTime: string;
  mlStatus: string;
}

export function DashboardHome({ firstName, serverTime, mlStatus }: DashboardHomeProps) {
  const greeting = firstName ? `Hello, ${firstName}` : 'Welcome back';

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
      <p className="mt-2 text-slate-600">
        Personalized recommendations are coming soon. For now — system status:
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>End-to-end smoke test of cross-package wiring.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            Server time (via tRPC + <code>@helpme2c/shared</code>): <Mono>{serverTime}</Mono>
          </p>
          <p>
            ML module status (via tRPC + <code>@helpme2c/ml</code>): <Mono>{mlStatus}</Mono>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
