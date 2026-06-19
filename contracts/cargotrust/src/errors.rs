use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, PartialEq, Eq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InvalidFeeBps = 4,
    ShipmentNotFound = 5,
    NotAuthorized = 6,
    InvalidStatusTransition = 7,
    EscrowAlreadyFunded = 8,
    InsufficientEscrow = 9,
    DisputeNotFound = 10,
    DisputeAlreadyOpen = 11,
    DisputeWindowClosed = 12,
    ContractPaused = 13,
    NoFeesToWithdraw = 14,
    Overflow = 15,
    InvalidInput = 16,
}
