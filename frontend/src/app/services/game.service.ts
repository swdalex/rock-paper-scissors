import {inject, Injectable, signal} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {catchError, Observable, switchMap, tap, throwError} from 'rxjs';

import {environment} from '../environments/environment';
import {GameResponse} from '../models/game-response';
import {GameRequest} from '../models/game-request';

@Injectable({
    providedIn: 'root'
})
export class GameService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiBaseUrl}/game`;

    currentSessionId = signal<string | null>(null);

    // Track if a session is being recovered to prevent infinite loops
    private isRecoveringSession = false;

    startNewGame(): Observable<GameResponse> {
        console.log('Starting new game session...');
        return this.http.post<GameResponse>(`${this.apiUrl}/start`, {}).pipe(
            tap(response => {
                if (response.success && response.sessionInfo?.sessionId) {
                    console.log('New session created:', response.sessionInfo.sessionId);
                    this.currentSessionId.set(response.sessionInfo.sessionId);
                    localStorage.setItem('currentSessionId', response.sessionInfo.sessionId);
                }
            }),
            catchError((error: HttpErrorResponse) => {
                console.error('Failed to start new game:', error);
                return throwError(() => new Error(`Failed to start game: ${error.message}`));
            })
        );
    }

    playMove(playerMove: string, sessionId?: string): Observable<GameResponse> {
        const effectiveSessionId = sessionId || this.currentSessionId();

        if (!effectiveSessionId) {
            console.warn('No session ID available, starting new game...');
            return this.startNewGameAndPlayMove(playerMove);
        }

        const request: GameRequest = {
            playerMove,
            sessionId: effectiveSessionId
        };

        console.log(`Playing move: ${playerMove} for session: ${effectiveSessionId}`);

        return this.http.post<GameResponse>(`${this.apiUrl}/play`, request).pipe(
            catchError((error: HttpErrorResponse) => {
                console.error('Error playing move:', error);

                if (this.isSessionNotFoundError(error) && !this.isRecoveringSession) {
                    console.warn('Session not found, attempting to recover...');
                    return this.recoverSessionAndRetryMove(playerMove);
                }

                return throwError(() => new Error(`Failed to play move: ${this.getErrorMessage(error)}`));
            }),
            tap(response => {
                if (response.success) {
                    console.log(`Move result: ${response.gameResult?.result}`);
                }
            })
        );
    }

    getSessionInfo(sessionId: string): Observable<GameResponse> {
        console.log(`Fetching session info for: ${sessionId}`);
        return this.http.get<GameResponse>(`${this.apiUrl}/session/${sessionId}`).pipe(
            catchError((error: HttpErrorResponse) => {
                console.error('Failed to get session info:', error);

                if (this.isSessionNotFoundError(error)) {
                    console.warn('Session not found when fetching info, clearing local session');
                    this.clearInvalidSession(sessionId);
                }

                return throwError(() => new Error(`Failed to get session info: ${this.getErrorMessage(error)}`));
            })
        );
    }

    getGameRules(): Observable<string> {
        return this.http.get(`${this.apiUrl}/rules`, {responseType: 'text'}).pipe(
            catchError((error: HttpErrorResponse) => {
                console.error('Failed to get game rules:', error);
                return throwError(() => new Error(`Failed to get game rules: ${error.message}`));
            })
        );
    }

    getAvailableMoves(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/moves`).pipe(
            catchError((error: HttpErrorResponse) => {
                console.error('Failed to get available moves:', error);
                return throwError(() => new Error(`Failed to get available moves: ${error.message}`));
            })
        );
    }

    loadSessionFromStorage(): void {
        const storedSessionId = localStorage.getItem('currentSessionId');
        if (storedSessionId) {
            console.log('Loading session from storage:', storedSessionId);

            this.getSessionInfo(storedSessionId).subscribe({
                next: (response) => {
                    if (response.success) {
                        console.log('Stored session is valid, using it');
                        this.currentSessionId.set(storedSessionId);
                    } else {
                        console.warn('Stored session is invalid, clearing it');
                        this.clearInvalidSession(storedSessionId);
                    }
                },
                error: (error) => {
                    console.warn('Stored session validation failed, clearing it:', error);
                    this.clearInvalidSession(storedSessionId);
                }
            });
        } else {
            console.log('No stored session found');
        }
    }

    clearSession(): void {
        const oldSessionId = this.currentSessionId();
        console.log('Clearing session:', oldSessionId);
        this.currentSessionId.set(null);
        localStorage.removeItem('currentSessionId');
    }

    private isSessionNotFoundError(error: HttpErrorResponse): boolean {
        return (error.status === 404 && error.error?.message?.includes('Session not found'));
    }

    private getErrorMessage(error: HttpErrorResponse): string {
        if (error.error?.message) {
            return error.error.message;
        }
        if (error.message) {
            return error.message;
        }
        return `HTTP ${error.status}: ${error.statusText}`;
    }

    private clearInvalidSession(sessionId: string): void {
        if (this.currentSessionId() === sessionId) {
            this.clearSession();
        }
        if (localStorage.getItem('currentSessionId') === sessionId) {
            localStorage.removeItem('currentSessionId');
        }
    }

    private startNewGameAndPlayMove(playerMove: string): Observable<GameResponse> {
        console.log('Starting new game and then playing move...');
        return this.startNewGame().pipe(
            switchMap(startResponse => {
                if (startResponse.success && startResponse.sessionInfo?.sessionId) {
                    console.log('New game started, now playing move with new session');
                    return this.playMove(playerMove, startResponse.sessionInfo.sessionId);
                } else {
                    return throwError(() => new Error('Failed to start new game'));
                }
            }),
            catchError(error => {
                console.error('Failed to start new game and play move:', error);
                return throwError(() => new Error(`Unable to start game: ${error.message}`));
            })
        );
    }

    private recoverSessionAndRetryMove(playerMove: string): Observable<GameResponse> {
        if (this.isRecoveringSession) {
            console.warn('Already recovering session, preventing infinite loop');
            return throwError(() => new Error('Session recovery in progress'));
        }

        this.isRecoveringSession = true;
        console.log('Recovering session and retrying move...');

        return this.startNewGameAndPlayMove(playerMove).pipe(
            tap(() => {
                this.isRecoveringSession = false;
                console.log('Session recovery completed successfully');
            }),
            catchError(error => {
                this.isRecoveringSession = false;
                console.error('Session recovery failed:', error);
                return throwError(() => new Error(`Session recovery failed: ${error.message}`));
            })
        );
    }
}