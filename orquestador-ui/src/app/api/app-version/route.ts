import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const cwd = process.cwd();
    const parentDir = path.resolve(cwd, '..');

    let commitHash = '';
    let commitDate = '';
    let commitMessage = '';
    let branch = '';
    let commitCount = '';

    // Intento 1: Ejecutar en el directorio actual (orquestador-ui)
    try {
      commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd }).trim();
      commitDate = execSync('git log -1 --format=%cd --date=format:"%d/%m/%Y %H:%M"', { encoding: 'utf8', cwd }).trim();
      commitMessage = execSync('git log -1 --format=%s', { encoding: 'utf8', cwd }).trim();
      branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', cwd }).trim();
      commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf8', cwd }).trim();
    } catch (err1) {
      // Intento 2: Ejecutar en el directorio padre (raíz del repositorio)
      try {
        commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: parentDir }).trim();
        commitDate = execSync('git log -1 --format=%cd --date=format:"%d/%m/%Y %H:%M"', { encoding: 'utf8', cwd: parentDir }).trim();
        commitMessage = execSync('git log -1 --format=%s', { encoding: 'utf8', cwd: parentDir }).trim();
        branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', cwd: parentDir }).trim();
        commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf8', cwd: parentDir }).trim();
      } catch (err2) {
        commitHash = process.env.NEXT_PUBLIC_BUILD_COMMIT || '6df1905';
        commitDate = '08/09/2026';
        branch = 'main';
        commitCount = '31';
      }
    }

    const version = `v2.0.${commitCount || '0'}`;

    return NextResponse.json({
      success: true,
      commit: commitHash || '6df1905',
      date: commitDate,
      message: commitMessage,
      branch: branch || 'main',
      buildNumber: commitCount || '31',
      version,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      commit: '6df1905',
      version: 'v2.0.31',
      error: err?.message
    });
  }
}
