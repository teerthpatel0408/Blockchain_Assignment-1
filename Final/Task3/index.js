class Block {
    constructor(index, timestamp, transactions, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return CryptoJS.SHA256(
            this.index +
            this.timestamp +
            JSON.stringify(this.transactions) +
            this.previousHash +
            this.nonce
        ).toString();
    }

    mineBlock(difficulty) {
        const target = Array(difficulty + 1).join("0");
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
    }
}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingTransactions = [];
        this.users = {
            'A': { publicKey: 'A', balance: 100 },
            'B': { publicKey: 'B', balance: 100 },
            'C': { publicKey: 'C', balance: 100 }
        };
    }

    createGenesisBlock() {
        return new Block(0, new Date().toLocaleString(), ["Genesis Block"], "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock) {
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.mineBlock(this.difficulty);
        this.chain.push(newBlock);
        this.pendingTransactions = []; // Clear pending transactions after mining
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }

            if (currentBlock.hash.substring(0, this.difficulty) !== Array(this.difficulty + 1).join("0")) {
                return false;
            }
        }
        return true;
    }

    addTransaction(sender, receiver, amount) {
        if (this.users[sender].balance >= amount) {
            this.pendingTransactions.push({ sender, receiver, amount });
            return true;
        }
        return false;
    }
}

const blockchain = new Blockchain();

// Finney Attack Related Variables
let preMinedBlock = null;
let isFinneyAttackMode = false;

// UI Elements
const blockchainElement = document.getElementById('blockchain');
const messageElement = document.getElementById('message');
const modal = document.getElementById('blockModal');
const span = document.getElementsByClassName("close")[0];
const modalIndex = document.getElementById('modalIndex');
const modalTimestamp = document.getElementById('modalTimestamp');
const modalPrevHash = document.getElementById('modalPrevHash');
const modalHash = document.getElementById('modalHash');
const modalNonce = document.getElementById('modalNonce');
const modalTransactions = document.getElementById('modalTransactions');
let selectedBlock = null;

// Transactions Pool
function addTransaction() {
    const sender = document.getElementById('sender').value.trim();
    const receiver = document.getElementById('receiver').value.trim();
    const amount = parseInt(document.getElementById('amount').value.trim());
    if (sender === "" || receiver === "" || amount === 0) {
        showMessage("❌ Invalid transaction details.", "red");
        return;
    }
    if (blockchain.addTransaction(sender, receiver, amount)) {
        showMessage("✅ Transaction added!", "green");
        updatePendingTransactionsList();
    } else {
        showMessage("❌ Insufficient balance.", "red");
    }
}

function mineBlock() {
    if (blockchain.pendingTransactions.length === 0) {
        showMessage("⚠️ No transactions to mine.", "orange");
        return;
    }

    let validTransactions = [];
    
    // Iterate pending transactions
    for (let i = 0; i < blockchain.pendingTransactions.length; i++) {
        let sender = blockchain.pendingTransactions[i].sender;
        let receiver = blockchain.pendingTransactions[i].receiver;
        let amount = blockchain.pendingTransactions[i].amount;
        
        // Ensure sender has sufficient balance
        if (blockchain.users[sender].balance - amount >= 0) {
            validTransactions.push(blockchain.pendingTransactions[i]);
            // Update balances only when transactions are mined
            blockchain.users[sender].balance -= amount;
            blockchain.users[receiver].balance += amount;
        }
    }

    const newBlock = new Block(
        blockchain.chain.length,
        new Date().toLocaleString(),
        validTransactions,
        blockchain.getLatestBlock().hash
    );

    newBlock.mineBlock(blockchain.difficulty);
    blockchain.addBlock(newBlock);

    showMessage(`🎉 Block #${newBlock.index} mined successfully!`, "green");

    updateUsersInfo();
    updatePendingTransactionsList();
    renderBlockchain();  // Re-render the blockchain after mining a new block
}

// Finney Attack Implementation
function startFinneyAttack() {
    isFinneyAttackMode = true;
    showMessage("⚠️ Finney Attack Mode Activated!", "orange");
}

function preMineBlock() {
    if (blockchain.pendingTransactions.length === 0) {
        showMessage("⚠️ No transactions to pre-mine.", "orange");
        return;
    }

    const newBlock = new Block(
        blockchain.chain.length,
        new Date().toLocaleString(),
        blockchain.pendingTransactions,
        blockchain.getLatestBlock().hash
    );
    newBlock.mineBlock(blockchain.difficulty);

    preMinedBlock = newBlock;
    blockchain.pendingTransactions = []; // Clear pending transactions
    showMessage("⛏️ Block pre-mined for Finney attack!", "blue");
    updatePendingTransactionsList();
}

function broadcastPreMinedBlock() {
    if (preMinedBlock === null) {
        showMessage("⚠️ No pre-mined block to broadcast.", "orange");
        return;
    }

    blockchain.chain.push(preMinedBlock);

    // Update balances based on pre-mined block's transactions
    preMinedBlock.transactions.forEach(tx => {
        blockchain.users[tx.sender].balance -= tx.amount;
        blockchain.users[tx.receiver].balance += tx.amount;
    });

    // Clear pending transactions since the pre-mined block should finalize all pending transactions
    blockchain.pendingTransactions = [];

    showMessage(`🎉 Pre-mined Block #${preMinedBlock.index} broadcasted!`, "green");
    updateUsersInfo();
    preMinedBlock = null; // Reset pre-mined block
    renderBlockchain();  // Re-render the blockchain after broadcasting pre-mined block
    updatePendingTransactionsList(); // Clear the displayed pending transactions list
}
function completeFinneyAttack() {
    if (!isFinneyAttackMode) {
        showMessage("⚠️ Finney Attack Mode is not active.", "orange");
        return;
    }

    // Simulate the second transaction from A to C before broadcasting the pre-mined block
    const sender = 'A';
    const receiver = 'C';
    const amount = 10;

    // Remove the check for duplicate transactions, allowing A to C to be added normally
    if (blockchain.addTransaction(sender, receiver, amount)) {
        showMessage("✅ Transaction to vendor (A to C) added!", "green");
        updatePendingTransactionsList();
        setTimeout(() => {
            // Now broadcast the pre-mined block, completing the attack
            broadcastPreMinedBlock();
            showMessage("❌ Vendor transaction (A to C) reversed by Finney attack!", "red");
            isFinneyAttackMode = false;
        }, 5000); // Simulate delay for vendor acceptance
    } else {
        showMessage("❌ Insufficient balance for Finney attack.", "red");
    }
}


function validateChain() {
    const isValid = blockchain.isChainValid();
    if (isValid) {
        showMessage("✅ Blockchain is valid.", "green");
    } else {
        showMessage("❌ Blockchain is invalid!", "red");
    }
}

// Function to display messages
function showMessage(msg, color) {
    messageElement.innerHTML = `<p style="color: ${color};">${msg}</p>`;
    setTimeout(() => {
        messageElement.innerHTML = "";
    }, 5000);
}

// Function to update user balances in the UI
function updateUsersInfo() {
    document.getElementById('user-a-wallet-amount').innerText = blockchain.users['A'].balance;
    document.getElementById('user-b-wallet-amount').innerText = blockchain.users['B'].balance;
    document.getElementById('user-c-wallet-amount').innerText = blockchain.users['C'].balance;
}

// Function to update the pending transactions list
function updatePendingTransactionsList() {
    const pendingTransactionsList = document.getElementById('pending-transactions-list');
    pendingTransactionsList.innerHTML = '';
    blockchain.pendingTransactions.forEach((transaction, index) => {
        const li = document.createElement('li');
        li.innerText = `#${index + 1}: From ${transaction.sender} to ${transaction.receiver}, Amount: ${transaction.amount}`;
        pendingTransactionsList.appendChild(li);
    });
}

// Render the blockchain to the UI
function renderBlockchain() {
    blockchainElement.innerHTML = '';
    blockchain.chain.forEach((block, index) => {
        const blockElement = createBlockElement(block);
        blockchainElement.appendChild(blockElement);

        // Add a triangle between blocks except the first block
        if (index > 0) {
            const triangle = document.createElement('div');
            triangle.className = 'triangle';
            blockchainElement.insertBefore(triangle, blockElement);
        }
    });
}

// Create a block element for rendering
function createBlockElement(block) {
    const blockElement = document.createElement('div');
    blockElement.classList.add('block');
    blockElement.innerText = block.index === 0 ? "Genesis Block" : `Block #${block.index}`;
    blockElement.addEventListener('click', () => openModal(block)); // Allow clicking to view details
    return blockElement;
}

// Open modal to view block details
function openModal(block) {
    selectedBlock = block;
    modal.style.display = "flex";
    modalIndex.innerText = block.index;
    modalTimestamp.innerText = block.timestamp;
    modalPrevHash.innerText = block.previousHash;
    modalHash.value = block.hash;
    modalNonce.innerText = block.nonce;
    modalTransactions.innerHTML = '';
    block.transactions.forEach(tx => {
        const li = document.createElement('li');
        li.innerText = `From: ${tx.sender}, To: ${tx.receiver}, Amount: ${tx.amount}`;
        modalTransactions.appendChild(li);
    });
}

// Close the modal when user clicks on the "X"
span.onclick = function () {
    modal.style.display = "none";
};

// Close the modal when clicking outside of it
window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Initialize Finney attack UI
function setupFinneyAttackUI() {
    const attackActionsDiv = document.createElement('div');
    attackActionsDiv.className = 'actions';

    const startAttackButton = document.createElement('button');
    startAttackButton.innerText = "Start Finney Attack";
    startAttackButton.onclick = startFinneyAttack;

    const preMineButton = document.createElement('button');
    preMineButton.innerText = "Pre-Mine Block";
    preMineButton.onclick = preMineBlock;

    const attackCompleteButton = document.createElement('button');
    attackCompleteButton.innerText = "Complete Finney Attack";
    attackCompleteButton.onclick = completeFinneyAttack;

    attackActionsDiv.appendChild(startAttackButton);
    attackActionsDiv.appendChild(preMineButton);
    attackActionsDiv.appendChild(attackCompleteButton);

    document.querySelector('.container').appendChild(attackActionsDiv);
}

// Call this function initially to setup UI and render the blockchain
setupFinneyAttackUI();
renderBlockchain();  // Render the initial blockchain (Genesis block)
updateUsersInfo();   // Update user balances
