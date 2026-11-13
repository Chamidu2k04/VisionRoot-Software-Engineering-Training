import { app } from '../src/app';

const server = app.listen(0, async () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Live verification against ${baseUrl}`);

  try {
    // 1. GET /api/health
    let res = await fetch(`${baseUrl}/api/health`);
    const healthData = await res.json();
    console.log('1. GET /api/health:', res.status, healthData.status);
    if (res.status !== 200 || healthData.status !== 'ok') throw new Error('Health check failed');

    // 2. GET /health
    res = await fetch(`${baseUrl}/health`);
    const rootHealthData = await res.json();
    console.log('2. GET /health:', res.status, rootHealthData.status);
    if (res.status !== 200) throw new Error('Root health failed');

    // 3. GET /api/requests (seed records)
    res = await fetch(`${baseUrl}/api/requests`);
    const initialList = await res.json();
    console.log('3. GET /api/requests:', res.status, `count=${initialList.length}`);
    if (res.status !== 200 || initialList.length < 2) throw new Error('Initial list failed');

    // 4. POST /api/requests valid
    res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Network printer offline on Floor 2',
        description: 'Printer cannot be found via network discovery since this morning.',
        category: 'IT',
        priority: 'MEDIUM',
      }),
    });
    const created = await res.json();
    console.log('4. POST /api/requests (valid):', res.status, `id=${created.id}, status=${created.status}`);
    if (res.status !== 201 || created.status !== 'OPEN') throw new Error('Create request failed');

    // 5. POST /api/requests validation error
    res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'bad',
        description: 'short',
        category: 'Invalid',
        priority: 'URGENT',
      }),
    });
    const valErr = await res.json();
    console.log('5. POST /api/requests (invalid):', res.status, valErr.error.code, `details=${valErr.error.details.length}`);
    if (res.status !== 400 || valErr.error.code !== 'VALIDATION_ERROR') throw new Error('Validation error check failed');

    // 6. GET /api/requests/:id
    res = await fetch(`${baseUrl}/api/requests/${created.id}`);
    const fetched = await res.json();
    console.log('6. GET /api/requests/:id:', res.status, `title="${fetched.title}"`);
    if (res.status !== 200 || fetched.id !== created.id) throw new Error('GetById failed');

    // 7. GET /api/requests/:id 404
    res = await fetch(`${baseUrl}/api/requests/00000000-0000-0000-0000-000000000000`);
    const notFound = await res.json();
    console.log('7. GET /api/requests/:id (404):', res.status, notFound.error.code);
    if (res.status !== 404) throw new Error('404 check failed');

    // 8. GET /api/requests/:id malformed UUID
    res = await fetch(`${baseUrl}/api/requests/not-a-valid-uuid`);
    const malformed = await res.json();
    console.log('8. GET /api/requests/:id (malformed UUID):', res.status, malformed.error.code);
    if (res.status !== 400) throw new Error('Malformed UUID check failed');

    // 9. PATCH /api/requests/:id/status invalid transition (OPEN -> RESOLVED)
    res = await fetch(`${baseUrl}/api/requests/${created.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RESOLVED' }),
    });
    const transitionErr = await res.json();
    console.log('9. PATCH invalid transition (OPEN->RESOLVED):', res.status, transitionErr.error.code);
    if (res.status !== 400 || transitionErr.error.code !== 'INVALID_STATUS_TRANSITION') throw new Error('Transition validation failed');

    // 10. PATCH /api/requests/:id/status valid transition (OPEN -> IN_PROGRESS)
    res = await fetch(`${baseUrl}/api/requests/${created.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    const updated = await res.json();
    console.log('10. PATCH valid transition (OPEN->IN_PROGRESS):', res.status, `status=${updated.status}`);
    if (res.status !== 200 || updated.status !== 'IN_PROGRESS') throw new Error('Valid transition failed');

    // 11. GET /api/requests?status=IN_PROGRESS
    res = await fetch(`${baseUrl}/api/requests?status=IN_PROGRESS`);
    const inProgressList = await res.json();
    console.log('11. GET /api/requests?status=IN_PROGRESS:', res.status, `count=${inProgressList.length}`);
    if (res.status !== 200 || inProgressList.length < 1) throw new Error('Status filter failed');

    // 12. Malformed JSON body
    res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ "title": broken',
    });
    const malformedJson = await res.json();
    console.log('12. Malformed JSON syntax error:', res.status, malformedJson.error.code);
    if (res.status !== 400 || malformedJson.error.code !== 'VALIDATION_ERROR') throw new Error('Malformed JSON check failed');

    console.log('\n===========================================');
    console.log('>>> ALL 12 API VERIFICATION CHECKS PASSED! <<<');
    console.log('===========================================');
  } catch (error) {
    console.error('API Verification error:', error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
