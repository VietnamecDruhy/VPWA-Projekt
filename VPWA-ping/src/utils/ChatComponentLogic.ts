import { ref, nextTick, onMounted, onUnmounted, watch, Ref, computed } from 'vue'
import { useQuasar, QNotifyCreateOptions, scroll } from 'quasar'
import ChannelService from 'src/services/ChannelService'
import { SerializedMessage, User } from 'src/contracts'
import { useStore } from 'vuex'


const { setVerticalScrollPosition } = scroll

export default {
  setup() {
    const $q = useQuasar()
    const isSmallScreen = ref(false)
    const searchQuery = ref('')
    const chatContainer: Ref<HTMLElement | null> = ref(null)
    const text = ref('')
    const isLoading = ref(false)
    const firstMessage: Ref<HTMLElement[]> = ref([])
    const observer: Ref<IntersectionObserver | null> = ref(null)
    const page = ref(1)
    const MESSAGES_PER_PAGE = 5
    const MessageMention = ref(false)
    const isDialogOpen = ref(false);
    const newChatName = ref('');

    const store = useStore()


    const channelName = 'general'
    const channel = ref(ChannelService.in(channelName))
    const joiningChannel = ref(false)
    const error = ref('')
    const messages = ref<SerializedMessage[]>([])
    const loading = ref(false)

    const loadChannelMessages = async () => {
      if (!channel.value) {
        error.value = 'No channel connection'
        return
      }

      loading.value = true
      error.value = ''

      try {
        const loadedMessages = await channel.value.loadMessages()
        messages.value = loadedMessages
      } catch (err) {
        console.error('Error loading messages:', err)
        error.value = err instanceof Error ? err.message : 'Failed to load messages'
      } finally {
        loading.value = false
      }
    }

    try {
      channel.value = ChannelService.join(channelName)

      // Subscribe to new messagess
      channel.value.socket.on('message', (message: SerializedMessage) => {
        messages.value.push(message)
      })
      loadChannelMessages()
    } catch (err) {
      console.error('Error joining channel:', err)
      error.value = err instanceof Error ? err.message : 'Failed to join channel'
    } finally {
      joiningChannel.value = false
    }

    const formattedMessages = computed(() => {
      return messages.value.map((message) => {
        console.log(messages.value[0].createdAt)
        const text = message.content;
        const mentionRegex = new RegExp(`@${currentUser.value.nickname}`, 'gi');

        // Apply highlight to any mention of the current user's name in the text
        const formattedText = text.replace(mentionRegex, '<span class="mention">$&</span>');

        return { ...message, text: formattedText };
      });
    });

    // Current logged-in user's profile
    const currentUser: Ref<User> = ref({
      id: 5,
      nickname: 'Fero',  // changed from 'name' to match interface
      email: '',         // required by interface
      createdAt: '',     // required by interface
      updatedAt: ''      // required by interface
    })



    const scrollToBottom = () => {
      nextTick(() => {
        const container = chatContainer.value
        if (container) {
          setVerticalScrollPosition(container, container.scrollHeight, 300)
        }
      })
    }

    const checkScreenSize = () => {
      isSmallScreen.value = $q.screen.lt.sm
    }

    // const loadMoreMessages = async () => {
    //   isLoading.value = true;

    //   const container = chatContainer.value;
    //   if (!container) {
    //     console.error('Chat container not found');
    //     isLoading.value = false;
    //     return;
    //   }

    //   const scrollHeight = container.scrollHeight; // Current height
    //   const scrollTop = container.scrollTop; // Current scroll position

    //   // Simulate API call delay
    //   await new Promise(resolve => setTimeout(resolve, 1000));

    //   const newMessages: Message[] = Array.from({ length: MESSAGES_PER_PAGE }, (_, i) => ({
    //     text: `Loaded message ${page.value * MESSAGES_PER_PAGE - i}`,
    //     from: i % 2 === 0 ? 'System' : 'OldUser',
    //     timestamp: new Date(Date.now() - (page.value * MESSAGES_PER_PAGE - i) * 60000)
    //   }));

    //   // Insert new messages at the beginning
    //   messages.value = [...newMessages, ...messages.value];

    //   nextTick(() => {
    //     if (container) {
    //       const newScrollHeight = container.scrollHeight;
    //       container.scrollTop = newScrollHeight - (scrollHeight - scrollTop);
    //     }
    //     isLoading.value = false;
    //   });

    //   page.value++;
    // };


    // const observeFirstMessage = () => {
    //   if (firstMessage.value[0]) {
    //     observer.value = new IntersectionObserver(
    //       (entries) => {
    //         if (entries[0].isIntersecting && !isLoading.value) {
    //           loadMoreMessages()
    //         }
    //       },
    //       { threshold: 1 }
    //     )
    //     observer.value.observe(firstMessage.value[0])
    //   }
    // }

    const openCreateChatDialog = () => {
      isDialogOpen.value = true;
    };

    onMounted(() => {
      console.log('Hello')
      console.log('Store Getters:', store)
      checkScreenSize()
      window.addEventListener('resize', checkScreenSize)
      scrollToBottom()
      // observeFirstMessage()
    })

    onUnmounted(() => {
      window.removeEventListener('resize', checkScreenSize)
      if (observer.value && firstMessage.value[0]) {
        observer.value.unobserve(firstMessage.value[0])
      }
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
      }
    })

    watch(() => messages.value.length, () => {
      if (!isLoading.value) {
        scrollToBottom()
      }
    })

    const formatTime = (timestamp: string): string => {
      const date1 = new Date(timestamp)

      return date1.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }

    const handleInput = () => {
      console.log('Input received:', text.value)
      const inputText = text.value.trim()

      if (inputText !== '') {
        if (inputText.startsWith('/')) {
          const command = inputText.slice(1).trim().toLowerCase()
          if (!handleCommand(command)) {
            console.error('Unrecognized command:', command)
          }
        } else {
          sendMessage()  // Trigger the message sending logic
        }
        clearTypingIndicator()  // Ensure typing indicator is cleared after input
      }

      // Forcefully clear the input text after message handling
      text.value = ''
    }


    const handleCommand = (command: string): boolean => {
      console.log('Command received:', command)
      switch (command) {
        case 'quit':
          quitChat()
          return true
        case 'clear':
          clearChat()
          return true
        case 'help':
          showHelp()
          return true
        // // case 'list':
        // //   showList()
        //   return true
        default:
          return false
      }
    }

    const quitChat = () => {
      showNotification('Quitting chat...', 'info')
      // TO DO
    }

    const clearChat = () => {
      messages.value = []
      showNotification('Chat cleared.', 'positive')
    }

    const showHelp = () => {
      showNotification(
        'Available commands:<br>/quit - Exit the chat<br>/clear - Clear chat history<br>/help - Show this help message',
        'info',
        0
      )
    }

    // const showList = () => {
    //   const userList = chatUsers.value
    //     .map(user => user.name)
    //     .join(', ');

    //   messages.value.push({
    //     text: `Users in chat:\n${userList}`,
    //     from: 'system',
    //     timestamp: new Date()
    //   });
    // };

    const showNotification = (message: string, type: string = 'info', timeout: number = 0) => {
      console.log('$q object:', $q)
      const notifyOptions: QNotifyCreateOptions = {
        message: message,
        position: 'top',
        color: type,
        timeout: timeout,
        actions: [{ icon: 'close', color: 'white' }]
      }
      $q.notify(notifyOptions)
    }

    const sendMessage = () => {
      if (text.value.trim() !== '') {
        const timestamp = new Date()
        messages.value.push({
          content: text.value,
          from: currentUser.value.nickname, // Use current user's name
          timestamp: timestamp
        })
        text.value = ''
        scrollToBottom()
      }
    }

    const shouldShowDateDivider = (index: number): boolean => {
      if (index === 0) return true

      const currentMessage = messages.value[index]
      const previousMessage = messages.value[index - 1]

      return !isSameDate(currentMessage.createdAt, previousMessage.createdAt)
    }

    const formatDate = (timestamp: string): string => {
      const date1 = new Date(timestamp);
      return date1.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
    }

    const isSameDate = (timestamp1: string, timestamp2: string): boolean => {
      const date1 = new Date(timestamp1);
      const date2 = new Date(timestamp2);

      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    };

    const isTyping = ref(false)
    const isTypingExpanded = ref(false)
    const typingTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

    const TYPING_TIMEOUT = 5000 // 30 seconds in milliseconds

    const handleTyping = () => {
      console.log('Handle typing:')
      isTyping.value = true

      // Clear existing timeout
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
      }

      // Set new timeout
      typingTimeout.value = setTimeout(() => {
        isTyping.value = false
        isTypingExpanded.value = false
      }, TYPING_TIMEOUT)
    }


    const toggleTypingExpansion = () => {
      isTypingExpanded.value = !isTypingExpanded.value
    }

    const clearTypingIndicator = () => {
      console.log('Clearing typing indicator')  // Debug log to check if it's called
      isTyping.value = false  // Reset the typing state
      isTypingExpanded.value = false  // Reset the expanded typing state

      // Clear the timeout that controls the typing indicator
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
        typingTimeout.value = null
      }
    }

    return {
      isSmallScreen,
      searchQuery,
      chatContainer,
      messages,
      text,
      isLoading,
      firstMessage,
      formatTime,
      handleInput,
      sendMessage,
      shouldShowDateDivider,
      formatDate,
      currentUser,
      isTyping,
      isTypingExpanded,
      handleTyping,
      toggleTypingExpansion,
      clearTypingIndicator,
      MESSAGES_PER_PAGE,
      MessageMention,
      formattedMessages,
      isDialogOpen,
      newChatName,
      openCreateChatDialog,
    }
  },
}
