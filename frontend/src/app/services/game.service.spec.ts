import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {GameService} from './game.service';
import {environment} from '../environments/environment';

interface GameResponse {
    success: boolean;
    sessionInfo?: { sessionId: string } & Record<string, any>;
    gameResult?: { result: string } & Record<string, any>;
}

describe('GameService', () => {
    let service: GameService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [GameService, provideHttpClient(), provideHttpClientTesting()]
        });

        service = TestBed.inject(GameService);
        httpMock = TestBed.inject(HttpTestingController);

        localStorage.clear();
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    it('startNewGame should store sessionId and update signal on success', () => {
        let resp: GameResponse | undefined;

        service.startNewGame().subscribe(r => (resp = r));

        const req = httpMock.expectOne(`${environment.apiBaseUrl}/game/start`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({});

        const sessionId = 'sess-123';
        req.flush({success: true, sessionInfo: {sessionId}} as GameResponse);

        expect(resp?.success).toBe(true);
        expect(service.currentSessionId()).toBe(sessionId);
        expect(localStorage.getItem('currentSessionId')).toBe(sessionId);
    });

    it('playMove should use existing sessionId and POST play', () => {
        service.currentSessionId.set('existing-session');

        let resp: GameResponse | undefined;
        service.playMove('STONE').subscribe(r => (resp = r));

        const req = httpMock.expectOne(`${environment.apiBaseUrl}/game/play`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({playerMove: 'STONE', sessionId: 'existing-session'});

        req.flush({success: true, gameResult: {result: 'WIN'}} as GameResponse);
        expect(resp?.success).toBe(true);
    });

    it('playMove without session should start new game then play move', () => {
        let callOrder: string[] = [];

        service.playMove('PAPER').subscribe();

        // First call: start
        const start = httpMock.expectOne(`${environment.apiBaseUrl}/game/start`);
        callOrder.push('start');
        const newSessionId = 'new-1';
        start.flush({success: true, sessionInfo: {sessionId: newSessionId}} as GameResponse);

        // Then play with the new session id
        const play = httpMock.expectOne(`${environment.apiBaseUrl}/game/play`);
        callOrder.push('play');
        expect(play.request.body).toEqual({playerMove: 'PAPER', sessionId: newSessionId});
        play.flush({success: true, gameResult: {result: 'DRAW'}} as GameResponse);

        expect(callOrder).toEqual(['start', 'play']);
    });

    it('playMove should recover when 404 Session not found occurs and retry once', () => {
        service.currentSessionId.set('invalid-session');

        service.playMove('SCISSORS').subscribe();

        // First play attempt -> 404 Session not found
        const firstPlay = httpMock.expectOne(`${environment.apiBaseUrl}/game/play`);
        firstPlay.flush({message: 'Session not found'}, {status: 404, statusText: 'Not Found'});

        // Should trigger startNewGame
        const start = httpMock.expectOne(`${environment.apiBaseUrl}/game/start`);
        const recoveredSession = 'recovered-1';
        start.flush({success: true, sessionInfo: {sessionId: recoveredSession}} as GameResponse);

        // And retry play with the new session id
        const retryPlay = httpMock.expectOne(`${environment.apiBaseUrl}/game/play`);
        expect(retryPlay.request.body).toEqual({playerMove: 'SCISSORS', sessionId: recoveredSession});
        retryPlay.flush({success: true, gameResult: {result: 'LOSE'}} as GameResponse);
    });

    it('getSessionInfo should clear invalid session on 404 Session not found', () => {
        const sid = 'to-clear';
        service.currentSessionId.set(sid);
        localStorage.setItem('currentSessionId', sid);

        service.getSessionInfo(sid).subscribe({
            next: () => {
                throw new Error('expected error');
            },
            error: () => {
                expect(service.currentSessionId()).toBeNull();
                expect(localStorage.getItem('currentSessionId')).toBeNull();
            }
        });

        const req = httpMock.expectOne(`${environment.apiBaseUrl}/game/session/${sid}`);
        req.flush({message: 'Session not found'}, {status: 404, statusText: 'Not Found'});
    });

    it('loadSessionFromStorage should validate and keep session if valid', () => {
        const sid = 'stored-1';
        localStorage.setItem('currentSessionId', sid);

        service.loadSessionFromStorage();

        const req = httpMock.expectOne(`${environment.apiBaseUrl}/game/session/${sid}`);
        req.flush({success: true, sessionInfo: {sessionId: sid}} as GameResponse);

        expect(service.currentSessionId()).toBe(sid);
    });

    it('clearSession should remove current session from signal and storage', () => {
        const sid = 'x-1';
        service.currentSessionId.set(sid);
        localStorage.setItem('currentSessionId', sid);

        service.clearSession();

        expect(service.currentSessionId()).toBeNull();
        expect(localStorage.getItem('currentSessionId')).toBeNull();
    });
});
