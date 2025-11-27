import {ComponentFixture, TestBed} from '@angular/core/testing';
import {GameBoardComponent} from './game-board.component';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {of, Subject} from 'rxjs';
import {GameResponse} from '../../models/game-response';
import {vi} from 'vitest';

describe('GameBoardComponent', () => {
    let fixture: ComponentFixture<GameBoardComponent>;
    let component: GameBoardComponent;

    const mockGameService = () => {
        const startNewGame$ = new Subject<GameResponse>();
        const playMove$ = new Subject<GameResponse>();

        return {
            startNewGame: vi.fn().mockReturnValue(startNewGame$.asObservable()),
            playMove: vi.fn().mockReturnValue(playMove$.asObservable()),
            getSessionInfo: vi.fn().mockImplementation((sid: string) => of({
                success: true,
                sessionInfo: {sessionId: sid}
            } as any)),
            loadSessionFromStorage: vi.fn(),
            currentSessionId: vi.fn().mockReturnValue(null),
            // Expose subjects to control emissions in tests
            __subjects: {startNewGame$, playMove$}
        } as any;
    };

    let gameService: any;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameBoardComponent],
            providers: [
                {provide: (await import('../../services/game.service')).GameService, useFactory: mockGameService},
            ],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(GameBoardComponent);
        component = fixture.componentInstance;
        gameService = TestBed.inject((await import('../../services/game.service')).GameService) as any;
    });

    it('ngOnInit without session should call startNewGame and update state', () => {
        gameService.currentSessionId.mockReturnValue(null);

        fixture.detectChanges();

        expect(gameService.loadSessionFromStorage).toHaveBeenCalled();
        expect(gameService.startNewGame).toHaveBeenCalled();

        expect(component.isLoading()).toBe(true);

        const resp: GameResponse = {success: true, sessionInfo: {sessionId: 's1'} as any} as any;
        gameService.__subjects.startNewGame$.next(resp);

        expect(component.sessionInfo()).toEqual(resp.sessionInfo as any);
        expect(component.lastResult()).toBeNull();
        expect(component.isLoading()).toBe(false);
    });

    it('ngOnInit with existing session should load session info', () => {
        gameService.currentSessionId.mockReturnValue('abc');

        fixture.detectChanges();

        expect(gameService.getSessionInfo).toHaveBeenCalledWith('abc');
        expect(component.sessionInfo()).toEqual(expect.objectContaining({sessionId: 'abc'} as any));
    });

    it('onMoveSelected should toggle loading and set lastResult & sessionInfo', () => {
        gameService.currentSessionId.mockReturnValue('abc');

        fixture.detectChanges();

        expect(component.isLoading()).toBe(false);
        component.onMoveSelected('STONE' as any);
        expect(gameService.playMove).toHaveBeenCalledWith('STONE' as any);
        expect(component.isLoading()).toBe(true);

        const resp: GameResponse = {
            success: true,
            gameResult: {result: 'WIN'} as any,
            sessionInfo: {sessionId: 'x'} as any
        } as any;
        gameService.__subjects.playMove$.next(resp);

        expect(component.lastResult()).toEqual(resp.gameResult as any);
        expect(component.sessionInfo()).toEqual(resp.sessionInfo as any);
        expect(component.isLoading()).toBe(false);
    });

    it('loadSessionInfo should call service when session exists', () => {
        fixture.detectChanges();

        vi.spyOn(component as any, 'loadSessionInfo');

        // Make service report a session
        gameService.currentSessionId.mockReturnValue('sid-1');

        component.loadSessionInfo();
        expect(gameService.getSessionInfo).toHaveBeenCalledWith('sid-1');
    });

    it('startNewGame should set loading false on error', () => {
        fixture.detectChanges();

        component.startNewGame();
        expect(component.isLoading()).toBe(true);

        gameService.__subjects.startNewGame$.error(new Error('boom'));
        expect(component.isLoading()).toBe(false);
    });

    it('onMoveSelected should set loading false on error', () => {
        fixture.detectChanges();

        component.onMoveSelected('PAPER' as any);
        expect(component.isLoading()).toBe(true);

        gameService.__subjects.playMove$.error(new Error('fail'));
        expect(component.isLoading()).toBe(false);
    });
});
