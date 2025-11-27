package com.stonescissorspaper.game.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stonescissorspaper.game.model.dto.GameRequest;
import com.stonescissorspaper.game.model.dto.GameResponse;
import com.stonescissorspaper.game.model.dto.GameResult;
import com.stonescissorspaper.game.model.dto.SessionInfo;
import com.stonescissorspaper.game.model.enums.Move;
import com.stonescissorspaper.game.model.enums.Result;
import com.stonescissorspaper.game.model.exception.GlobalExceptionHandler;
import com.stonescissorspaper.game.service.GameService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.time.Instant;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class GameControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private GameService gameService;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        GameController controller = new GameController(gameService);
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void startNewGame_returnsOkWithSession() throws Exception {
        SessionInfo session = SessionInfo.builder().sessionId("sess-1").createdAt(Instant.now()).lastActivity(Instant.now()).build();
        when(gameService.startNewGame())
                .thenReturn(GameResponse.success("Game session created successfully", session));

        mockMvc.perform(post("/api/game/start"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.sessionInfo.sessionId", is("sess-1")));

        verify(gameService, times(1)).startNewGame();
    }

    @Test
    void playMove_usesSessionIdFromBody_overQueryParam() throws Exception {
        SessionInfo session = SessionInfo.builder().sessionId("body-id").build();
        GameResult result = GameResult.builder()
                .playerMove(Move.STONE)
                .computerMove(Move.SCISSORS)
                .result(Result.WIN)
                .message("STONE beats SCISSORS - You win!")
                .timestamp(Instant.now())
                .build();
        when(gameService.playMove(any(), any())).thenReturn(GameResponse.success("ok", session, result));

        GameRequest request = GameRequest.builder().playerMove("STONE").sessionId("body-id").build();

        mockMvc.perform(post("/api/game/play").param("sessionId", "query-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameResult.result", is("win")));

        ArgumentCaptor<String> sidCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<GameRequest> reqCaptor = ArgumentCaptor.forClass(GameRequest.class);
        verify(gameService).playMove(sidCaptor.capture(), reqCaptor.capture());
        // Expect the controller to take sessionId from body when provided
        org.junit.jupiter.api.Assertions.assertEquals("body-id", sidCaptor.getValue());
    }

    @Test
    void playMove_validationError_onInvalidMove() throws Exception {
        GameRequest request = GameRequest.builder().playerMove("LIZARD").build();

        mockMvc.perform(post("/api/game/play")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("Validation")))
                .andExpect(jsonPath("$.message", containsString("playerMove")));

        verifyNoInteractions(gameService);
    }

    @Test
    void getSessionInfo_returnsOk() throws Exception {
        SessionInfo session = SessionInfo.builder().sessionId("abc").build();
        when(gameService.getSessionInfo("abc")).thenReturn(GameResponse.success("ok", session));

        mockMvc.perform(get("/api/game/session/{sessionId}", "abc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionInfo.sessionId", is("abc")));
    }

    @Test
    void getGameRules_returnsText() throws Exception {
        mockMvc.perform(get("/api/game/rules"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Stone Scissors Paper Rules:")));
    }

    @Test
    void getAvailableMoves_returnsList() throws Exception {
        mockMvc.perform(get("/api/game/moves"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$", containsInAnyOrder("STONE", "SCISSORS", "PAPER")));
    }
}
