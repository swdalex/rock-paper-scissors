package com.stonescissorspaper.game.service;

import com.stonescissorspaper.game.model.dto.GameRequest;
import com.stonescissorspaper.game.model.dto.GameResponse;
import com.stonescissorspaper.game.model.dto.GameResult;
import com.stonescissorspaper.game.model.dto.SessionInfo;
import com.stonescissorspaper.game.model.enums.Move;
import com.stonescissorspaper.game.model.enums.Result;
import com.stonescissorspaper.game.model.exception.InvalidMoveException;
import com.stonescissorspaper.game.model.exception.SessionNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameServiceTest {

    @Mock
    private SessionService sessionService;

    @Mock
    private ComputerMoveService computerMoveService;

    @InjectMocks
    private GameService gameService;

    @BeforeEach
    void init() {
        // MockitoExtension initializes mocks
    }

    @Test
    void startNewGame_createsSession_andReturnsResponse() {
        when(sessionService.createSession(anyString()))
                .thenReturn(SessionInfo.builder().sessionId("abc").build());

        GameResponse response = gameService.startNewGame();

        assertTrue(response.isSuccess());
        assertNotNull(response.getSessionInfo());
        assertNotNull(response.getSessionInfo().getSessionId());
        verify(sessionService, times(1)).createSession(anyString());
    }

    @Test
    void getSessionInfo_returnsSession_whenExists() {
        SessionInfo session = SessionInfo.builder().sessionId("id1").build();
        when(sessionService.getSession("id1")).thenReturn(Optional.of(session));

        GameResponse response = gameService.getSessionInfo("id1");

        assertTrue(response.isSuccess());
        assertEquals(session, response.getSessionInfo());
    }

    @Test
    void getSessionInfo_throws_whenMissing() {
        when(sessionService.getSession("missing")).thenReturn(Optional.empty());
        assertThrows(SessionNotFoundException.class, () -> gameService.getSessionInfo("missing"));
    }

    @Test
    void playMove_happyPath_buildsResult_andUpdatesSession() {
        String sessionId = "s1";
        when(sessionService.sessionExists(sessionId)).thenReturn(true);
        when(computerMoveService.generateComputerMove()).thenReturn(Move.SCISSORS);

        SessionInfo updated = SessionInfo.builder().sessionId(sessionId).gamesPlayed(1).playerWins(1).build();
        ArgumentCaptor<GameResult> captor = ArgumentCaptor.forClass(GameResult.class);
        when(sessionService.recordGameResult(eq(sessionId), captor.capture())).thenReturn(updated);

        GameRequest request = GameRequest.builder().playerMove("STONE").build();

        GameResponse response = gameService.playMove(sessionId, request);

        assertTrue(response.isSuccess());
        assertEquals(updated, response.getSessionInfo());
        assertNotNull(response.getGameResult());
        assertEquals(Move.STONE, response.getGameResult().getPlayerMove());
        assertEquals(Move.SCISSORS, response.getGameResult().getComputerMove());
        assertEquals(Result.WIN, response.getGameResult().getResult());
        assertTrue(response.getGameResult().getMessage().contains("You win"));

        GameResult sent = captor.getValue();
        assertEquals(Result.WIN, sent.getResult());
        verify(sessionService).recordGameResult(eq(sessionId), any());
    }

    @Test
    void playMove_throws_whenSessionMissing() {
        when(sessionService.sessionExists("missing")).thenReturn(false);
        GameRequest request = GameRequest.builder().playerMove("STONE").build();
        assertThrows(SessionNotFoundException.class, () -> gameService.playMove("missing", request));
    }

    @Test
    void playMove_throws_onInvalidMove_nullOrBlank() {
        when(sessionService.sessionExists("s1")).thenReturn(true);
        assertThrows(InvalidMoveException.class, () -> gameService.playMove("s1", GameRequest.builder().playerMove(null).build()));
        assertThrows(InvalidMoveException.class, () -> gameService.playMove("s1", GameRequest.builder().playerMove(" ").build()));
    }

    @Test
    void playMove_throws_onInvalidMove_value() {
        when(sessionService.sessionExists("s1")).thenReturn(true);
        GameRequest request = GameRequest.builder().playerMove("LIZARD").build();
        assertThrows(InvalidMoveException.class, () -> gameService.playMove("s1", request));
    }
}
