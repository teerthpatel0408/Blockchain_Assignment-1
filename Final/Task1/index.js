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
        this.difficulty = 2; // Number of leading zeros required
        this.pendingTransactions = [];
        this.users = {
            'A': {
                publicKey: 'A',
                privateKey: 'A',
                balance: 100
            },
            'B': {
                publicKey: 'B',
                privateKey: 'B',
                balance: 100
            },
            'C': {
                publicKey: 'C',
                privateKey: 'C',
                balance: 100
            }
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
        this.pendingTransactions = [];
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
            this.pendingTransactions.push({ sender, receiver, amount });
            return true;
    }
}


const blockchain = new Blockchain();

// UI Elements
const blockchainElement = document.getElementById('blockchain');
const messageElement = document.getElementById('message');
const senderInput = document.getElementById('sender');
const receiverInput = document.getElementById('receiver');
const amountInput = document.getElementById('amount');

        // Modal Elements
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
    const sender = senderInput.value.trim();
    const receiver = receiverInput.value.trim();
    const amount = parseInt(amountInput.value.trim());
    if (sender === "" || receiver === "" || amount === 0) {
        showMessage("❌ Invalid transaction details.", "red");
        return;
    }
    if (blockchain.addTransaction(sender, receiver, amount)) {
        showMessage("✅ Transaction added!", "green");
        senderInput.value = "";
        receiverInput.value = "";
        amountInput.value = "";
        updatePendingTransactionsList();
    } else {
        showMessage("❌ Insufficient balance.", "red");
    }
}


// Validate the Blockchain
function validateChain() {
    const isValid = blockchain.isChainValid();
    if (isValid) {
        showMessage("✅ Blockchain is valid.", "green");
    } else {
        showMessage("❌ Blockchain is invalid!", "red");
    }
}

// Display Messages to User
function showMessage(msg, color) {
    messageElement.innerHTML = `<p style="color: ${color};">${msg}</p>`;
    setTimeout(() => {
        messageElement.innerHTML = "";
    }, 5000);
}

// Render the Blockchain on the Page
function renderBlockchain() {
    blockchainElement.innerHTML = '';
    blockchain.chain.forEach((block, index) => {
        const blockElement = createBlockElement(block);
        blockchainElement.appendChild(blockElement);

        // Add a triangle between blocks except before the first block of each row
        if (index > 0 && index % 5 !== 0) { // Change 5 to the number of blocks per row
            const triangle = document.createElement('div');
            triangle.className = 'triangle';
            blockchainElement.insertBefore(triangle, blockElement);
        }
    });
}

// Create Block Element
function createBlockElement(block) {
    const blockElement = document.createElement('div');
    blockElement.classList.add('block', 'animate__animated', 'animate__fadeIn');
    blockElement.innerText = block.index === 0 ? "Genesis Block" : `Block #${block.index}`;
    // Add click event to open modal
    blockElement.addEventListener('click', () => {
        openModal(block);
    });
    return blockElement;
}

// Render Blockchain with Animation when Adding a New Block
function renderBlockchainWithAnimation(newBlock) {
    const blocks = blockchainElement.getElementsByClassName('block');
    const lastBlock = blocks[blocks.length - 1];

    // Create a new triangle if it's not the start of a new row
    if (blocks.length % 5 !== 0) { // Adjust 5 based on blocks per row
        const newTriangle = document.createElement('div');
        newTriangle.classList.add('triangle', 'animate__animated', 'animate__fadeIn');
        blockchainElement.appendChild(newTriangle);
    }

    // Create new block element but keep it hidden initially
    const newBlockElement = createBlockElement(newBlock);
    newBlockElement.style.opacity = 0;
    blockchainElement.appendChild(newBlockElement);

    // Animate the new block appearing
    setTimeout(() => {
        newBlockElement.style.opacity = 1;
        newBlockElement.classList.add('animate__fadeIn');
    }, 500);

    // Scroll to the latest block
    const blockchainContainer = document.querySelector('.blockchain-container');
    setTimeout(() => {
        blockchainContainer.scrollLeft = blockchainContainer.scrollWidth;
    }, 1000);
}

// Modal Functionality
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

// Save the edited hash
function saveHash() {
    if (selectedBlock) {
        selectedBlock.hash = modalHash.value;
        showMessage("✅ Hash updated. Validate chain to check integrity.", "blue");
        modal.style.display = "none";
    }
}

// Close Modal when user clicks on <span> (x)
span.onclick = function () {
    modal.style.display = "none";
}

// Close Modal when user clicks anywhere outside of the modal
window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}


// Initial Render
renderBlockchain();

const userAPublicKeyElement = document.getElementById('user-a-public-key');
const userAWalletAmountElement = document.getElementById('user-a-wallet-amount');
const userBPublicKeyElement = document.getElementById('user-b-public-key');
const userBWalletAmountElement = document.getElementById('user-b-wallet-amount');
const userCPublicKeyElement = document.getElementById('user-c-public-key');
const userCWalletAmountElement = document.getElementById('user-c-wallet-amount');

// Define the users' information
blockchain.users = {
    'A': {
        publicKey: 'public key A',
        balance: 100
    },
    'B': {
        publicKey: 'public key B',
        balance: 100
    },
    'C': {
        publicKey: 'public key C',
        balance: 100
    }
};

// Function to update the users' information
function updateUsersInfo() {

    const userAWalletAmountElement = document.getElementById('user-a-wallet-amount');
    const userBWalletAmountElement = document.getElementById('user-b-wallet-amount');
    const userCWalletAmountElement = document.getElementById('user-c-wallet-amount');

    userAWalletAmountElement.innerText = blockchain.users['A'].balance;
    userBWalletAmountElement.innerText = blockchain.users['B'].balance;
    userCWalletAmountElement.innerText = blockchain.users['C'].balance;

}

// Call the updateUsersInfo function initially
updateUsersInfo();

// Update the mineBlock function to update the users' information after mining a block
function mineBlock() {
    if (blockchain.pendingTransactions.length === 0) {
        showMessage("⚠️ No transactions to mine.", "orange");
        return;
    }

    let validTransactions = [];
    //iterate pendingTransactions and if sender balance does become negative then add it to valid transaction and update the wallet values

    // iterate pendingTransactions
    for (let i = 0; i < blockchain.pendingTransactions.length; i++) {
        //sender receiver amount
        let sender = blockchain.pendingTransactions[i].sender;
        let receiver = blockchain.pendingTransactions[i].receiver;
        let amount = blockchain.pendingTransactions[i].amount;
        // check if sender balance does become negative
        if (blockchain.users[sender].balance - amount >= 0) {
            // add it to valid transaction
            validTransactions.push(blockchain.pendingTransactions[i]);
            // update the wallet values
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
    showMessage("⛏️ Mining block...", "blue");
    // Mining is a synchronous process here
    newBlock.mineBlock(blockchain.difficulty);
    blockchain.addBlock(newBlock);
    showMessage(`🎉 Block #${newBlock.index} mined successfully!`, "green");
    renderBlockchainWithAnimation(newBlock);
    updateUsersInfo(); // Update the users' information after mining a block

    updatePendingTransactionsList();
}


// Get the pending transactions list element
const pendingTransactionsList = document.getElementById('pending-transactions-list');

// Function to update the pending transactions list
function updatePendingTransactionsList() {
    pendingTransactionsList.innerHTML = '';
    blockchain.pendingTransactions.forEach((transaction, index) => {
        const li = document.createElement('li');
        li.innerText = `#${index + 1}: From ${transaction.sender} to ${transaction.receiver}, Amount: ${transaction.amount}`;
        pendingTransactionsList.appendChild(li);
    });
}

// Call the updatePendingTransactionsList function initially
updatePendingTransactionsList();


