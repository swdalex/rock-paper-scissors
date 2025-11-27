package com.stonescissorspaper.game.service;

import com.stonescissorspaper.game.model.dto.GameResult;
import com.stonescissorspaper.game.model.dto.SessionInfo;
import com.stonescissorspaper.game.model.enums.Move;
import com.stonescissorspaper.game.model.enums.Result;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class SessionServiceTest {

    private SessionService sessionService;

    @BeforeEach
    void setUp() {
        sessionService = new SessionService();
    }

    @Test
    void createSession_initializesFields() {
        String id = "session-1";
        SessionInfo session = sessionService.createSession(id);

        assertNotNull(session);
        assertEquals(id, session.getSessionId());
        assertEquals(0, session.getGamesPlayed());
        assertEquals(0, session.getPlayerWins());
        assertEquals(0, session.getComputerWins());
        assertEquals(0, session.getDraws());
        assertEquals(0.0, session.getPlayerWinPercentage());
        assertNotNull(session.getCreatedAt());
        assertNotNull(session.getLastActivity());
    }

    @Test
    void getSession_updatesLastActivity() throws InterruptedException {
        String id = "session-2";
        SessionInfo created = sessionService.createSession(id);
        Instant initialLastActivity = created.getLastActivity();

        Thread.sleep(5); // ensure time difference
        SessionInfo fetched = sessionService.getSession(id).orElseThrow();

        assertTrue(fetched.getLastActivity().isAfter(initialLastActivity));
    }

    @Test
    void sessionExists_returnsTrueWhenPresent() {
        String id = "session-3";
        assertFalse(sessionService.sessionExists(id));
        sessionService.createSession(id);
        assertTrue(sessionService.sessionExists(id));
    }

    @Test
    void recordGameResult_updatesStatsAndPercentage() {
        String id = "session-4";
        sessionService.createSession(id);

        // Player wins
        sessionService.recordGameResult(id, GameResult.builder()
                .result(Result.WIN)
                .playerMove(Move.STONE)
                .computerMove(Move.SCISSORS)
                .build());

        SessionInfo afterWin = sessionService.getSession(id).orElseThrow();
        assertEquals(1, afterWin.getGamesPlayed());
        assertEquals(1, afterWin.getPlayerWins());
        assertEquals(0, afterWin.getComputerWins());
        assertEquals(0, afterWin.getDraws());
        assertEquals(100.0, afterWin.getPlayerWinPercentage());

        // Computer wins
        sessionService.recordGameResult(id, GameResult.builder()
                .result(Result.LOSE)
                .playerMove(Move.PAPER)
                .computerMove(Move.SCISSORS)
                .build());

        SessionInfo afterLose = sessionService.getSession(id).orElseThrow();
        assertEquals(2, afterLose.getGamesPlayed());
        assertEquals(1, afterLose.getPlayerWins());
        assertEquals(1, afterLose.getComputerWins());
        assertEquals(0, afterLose.getDraws());
        assertEquals(50.0, afterLose.getPlayerWinPercentage());

        // Draw
        sessionService.recordGameResult(id, GameResult.builder()
                .result(Result.DRAW)
                .playerMove(Move.PAPER)
                .computerMove(Move.PAPER)
                .build());

        SessionInfo afterDraw = sessionService.getSession(id).orElseThrow();
        assertEquals(3, afterDraw.getGamesPlayed());
        assertEquals(1, afterDraw.getPlayerWins());
        assertEquals(1, afterDraw.getComputerWins());
        assertEquals(1, afterDraw.getDraws());
        assertEquals(33.33, afterDraw.getPlayerWinPercentage());
    }
}
