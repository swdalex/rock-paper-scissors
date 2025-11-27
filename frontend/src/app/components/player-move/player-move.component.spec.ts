import {ComponentFixture, TestBed} from '@angular/core/testing';
import {PlayerMoveComponent} from './player-move.component';
import {GameMove} from '../../models/game-move';
import {vi} from 'vitest';

describe('PlayerMoveComponent', () => {
    let fixture: ComponentFixture<PlayerMoveComponent>;
    let component: PlayerMoveComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayerMoveComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerMoveComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should emit moveSelected when not loading', () => {
        vi.spyOn(component.moveSelected, 'emit');
        component.isLoading = false;

        component.selectMove(GameMove.STONE);
        expect(component.moveSelected.emit).toHaveBeenCalledWith(GameMove.STONE);
    });

    it('should not emit moveSelected when loading', () => {
        vi.spyOn(component.moveSelected, 'emit');
        component.isLoading = true;

        component.selectMove(GameMove.PAPER);
        expect(component.moveSelected.emit).not.toHaveBeenCalled();
    });

    it('getMoveButtonClass should include disabled styles when loading', () => {
        component.isLoading = true;
        const cls = component.getMoveButtonClass(GameMove.SCISSORS);
        expect(cls).toContain('opacity-50');
        expect(cls).toContain('cursor-not-allowed');
    });

    it('getMoveButtonClass should include hover styles when not loading', () => {
        component.isLoading = false;
        const cls = component.getMoveButtonClass(GameMove.SCISSORS);
        expect(cls).toContain('hover:shadow-xl');
    });

    it('getMoveEmoji should return correct emoji per move', () => {
        expect(component.getMoveEmoji(GameMove.STONE)).toBe('✊');
        expect(component.getMoveEmoji(GameMove.SCISSORS)).toBe('✌️');
        expect(component.getMoveEmoji(GameMove.PAPER)).toBe('✋');
    });
});
