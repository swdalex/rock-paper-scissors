package com.stonescissorspaper.game.util;

import com.stonescissorspaper.game.model.enums.Move;
import com.stonescissorspaper.game.model.enums.Result;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GameRulesTest {

    @Test
    @DisplayName("determineWinner: all combinations")
    void testDetermineWinnerAllCombinations() {
        // Draws
        assertEquals(Result.DRAW, GameRules.determineWinner(Move.STONE, Move.STONE));
        assertEquals(Result.DRAW, GameRules.determineWinner(Move.SCISSORS, Move.SCISSORS));
        assertEquals(Result.DRAW, GameRules.determineWinner(Move.PAPER, Move.PAPER));

        // Wins
        assertEquals(Result.WIN, GameRules.determineWinner(Move.STONE, Move.SCISSORS));
        assertEquals(Result.WIN, GameRules.determineWinner(Move.SCISSORS, Move.PAPER));
        assertEquals(Result.WIN, GameRules.determineWinner(Move.PAPER, Move.STONE));

        // Loses
        assertEquals(Result.LOSE, GameRules.determineWinner(Move.STONE, Move.PAPER));
        assertEquals(Result.LOSE, GameRules.determineWinner(Move.SCISSORS, Move.STONE));
        assertEquals(Result.LOSE, GameRules.determineWinner(Move.PAPER, Move.SCISSORS));
    }

    @Test
    @DisplayName("isValidMove: valid values (case-insensitive)")
    void testIsValidMoveValid() {
        assertTrue(GameRules.isValidMove("STONE"));
        assertTrue(GameRules.isValidMove("stone"));
        assertTrue(GameRules.isValidMove("ScIsSoRs"));
        assertTrue(GameRules.isValidMove("paper"));
    }

    @Test
    @DisplayName("isValidMove: invalid and null")
    void testIsValidMoveInvalid() {
        assertFalse(GameRules.isValidMove(null));
        assertFalse(GameRules.isValidMove(""));
        assertFalse(GameRules.isValidMove("  "));
        assertFalse(GameRules.isValidMove("lizard"));
    }
}
